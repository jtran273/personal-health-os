import Foundation

/// Client for the Oura Cloud API v2.
///
/// Authenticates with a Personal Access Token resolved from `OuraTokenStore`.
/// Maps vendor DTOs (`OuraDTO.*`) into the app's source-agnostic domain types
/// (`SleepRecovery`, `MetricSample`) so the rest of the codebase never touches Oura's schema.
///
/// Endpoints:
///   - `GET /v2/usercollection/personal_info`
///   - `GET /v2/usercollection/daily_sleep`
///   - `GET /v2/usercollection/daily_readiness`
///   - `GET /v2/usercollection/daily_activity`
///   - `GET /v2/usercollection/sleep`
public final class OuraService {

    public static let baseURL = URL(string: "https://api.ouraring.com/v2/usercollection")!

    private let session: URLSession
    private let tokenProvider: () -> String?
    private let decoder: JSONDecoder

    /// - Parameters:
    ///   - session: URLSession to use (override in tests).
    ///   - tokenProvider: closure that returns the current access token, or nil if not configured.
    public init(
        session: URLSession = .shared,
        tokenProvider: @escaping () -> String? = { OuraTokenStore.shared.currentToken() }
    ) {
        self.session = session
        self.tokenProvider = tokenProvider

        let decoder = JSONDecoder()
        self.decoder = decoder
    }

    // MARK: - Public API

    /// Verifies the token and returns the user's personal info. Useful as a connectivity check.
    func personalInfo() async throws -> OuraDTO.PersonalInfo {
        try await request("personal_info", queryItems: [])
    }

    /// Maps Oura's sleep + readiness into a single `SleepRecovery` snapshot for the given date.
    /// Returns nil if no data is available for that day.
    ///
    /// Quirk: `daily_sleep` and `daily_readiness` use the *morning-of* date, but a sleep
    /// `session` is dated by the day it started — so the session for the night that ended
    /// on `date` typically lives under `date - 1`. We query a 2-day window and pick the
    /// most recent `long_sleep` to handle either convention.
    public func fetchSleep(for date: Date) async throws -> SleepRecovery? {
        let day = Self.dayString(date)
        let priorDay = Self.dayString(Calendar.current.date(byAdding: .day, value: -1, to: date) ?? date)

        async let dailySleepPage: OuraDTO.Page<OuraDTO.DailySleep> = request(
            "daily_sleep", queryItems: dateRangeQuery(day: day))
        async let readinessPage: OuraDTO.Page<OuraDTO.DailyReadiness> = request(
            "daily_readiness", queryItems: dateRangeQuery(day: day))
        async let sleepPage: OuraDTO.Page<OuraDTO.SleepSession> = request(
            "sleep", queryItems: [
                URLQueryItem(name: "start_date", value: priorDay),
                URLQueryItem(name: "end_date", value: day)
            ])

        let (sleepDaily, readiness, sessions) = try await (dailySleepPage, readinessPage, sleepPage)

        // Pick the most recent long_sleep (or any session) across the 2-day window.
        let candidateSessions = sessions.data.sorted { ($0.bedtimeEnd ?? $0.day) > ($1.bedtimeEnd ?? $1.day) }
        let session = candidateSessions.first(where: { $0.type == "long_sleep" })
            ?? candidateSessions.first

        let readinessForDay = readiness.data.first(where: { $0.day == day })
        let dailyForDay = sleepDaily.data.first(where: { $0.day == day })

        // If nothing matched at all, there's no Oura data for this day yet.
        if session == nil && readinessForDay == nil && dailyForDay == nil {
            return nil
        }

        let now = Date()

        let totalSleep: MetricSample<Int>? = session?.totalSleepDuration.map { secs in
            MetricSample(value: secs / 60, source: .oura, confidence: 0.85, capturedAt: now)
        }
        let hrv: MetricSample<Double>? = session?.averageHrv.map { hrv in
            MetricSample(value: Double(hrv), source: .oura, confidence: 0.9, capturedAt: now)
        }
        let restingHR: MetricSample<Int>? = session?.lowestHeartRate.map { rhr in
            MetricSample(value: rhr, source: .oura, confidence: 0.95, capturedAt: now)
        }
        let readinessSample: MetricSample<Int>? = readinessForDay?.score.map { score in
            MetricSample(value: score, source: .oura, confidence: 0.8, capturedAt: now)
        }
        let skinTemp: MetricSample<Double>? = readinessForDay?.temperatureDeviation.map { delta in
            MetricSample(value: delta, source: .oura, confidence: 0.7, capturedAt: now)
        }

        return SleepRecovery(
            date: date,
            totalSleepMinutes: totalSleep,
            hrv: hrv,
            restingHR: restingHR,
            readinessScore: readinessSample,
            skinTempDelta: skinTemp
        )
    }

    /// Returns `(steps, activeCalories)` for the given day, or nil if Oura has no record yet.
    /// Queries a 2-day window so an early-morning sync that hasn't produced today's row
    /// can fall back to yesterday's totals.
    public func fetchActivity(for date: Date) async throws -> (steps: Int, activeCalories: Int)? {
        let day = Self.dayString(date)
        let priorDay = Self.dayString(Calendar.current.date(byAdding: .day, value: -1, to: date) ?? date)
        let page: OuraDTO.Page<OuraDTO.DailyActivity> = try await request(
            "daily_activity", queryItems: [
                URLQueryItem(name: "start_date", value: priorDay),
                URLQueryItem(name: "end_date", value: day)
            ])
        // Prefer today; fall back to the most recent day with both steps and active calories.
        let candidates = page.data.sorted { $0.day > $1.day }
        let entry = candidates.first(where: { $0.day == day && $0.steps != nil && $0.activeCalories != nil })
            ?? candidates.first(where: { $0.steps != nil && $0.activeCalories != nil })
        guard let entry, let steps = entry.steps, let active = entry.activeCalories else {
            return nil
        }
        return (steps, active)
    }

    // MARK: - Networking

    private func dateRangeQuery(day: String) -> [URLQueryItem] {
        // The API treats end_date as inclusive; passing the same day twice yields that day's record.
        [
            URLQueryItem(name: "start_date", value: day),
            URLQueryItem(name: "end_date", value: day)
        ]
    }

    private func request<T: Decodable>(_ path: String, queryItems: [URLQueryItem]) async throws -> T {
        guard let token = tokenProvider(), !token.isEmpty else { throw OuraAPIError.missingToken }

        var components = URLComponents(url: Self.baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !queryItems.isEmpty { components.queryItems = queryItems }
        guard let url = components.url else { throw OuraAPIError.invalidResponse }

        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 30

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw OuraAPIError.transport(underlying: error)
        }

        guard let http = response as? HTTPURLResponse else { throw OuraAPIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8)
            throw OuraAPIError.http(status: http.statusCode, body: body)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw OuraAPIError.decoding(underlying: error)
        }
    }

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone.current
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func dayString(_ date: Date) -> String { dayFormatter.string(from: date) }
}
