import Foundation

/// Codable response shapes for the Oura Cloud API v2.
///
/// We keep these as vendor-specific DTOs that never leak into `Models/` or `Features/` —
/// `OuraService` maps them into our source-agnostic `MetricSample` / `SleepRecovery` types.
enum OuraDTO {

    /// Generic paginated envelope returned by list endpoints (e.g. `/usercollection/daily_sleep`).
    struct Page<Item: Decodable>: Decodable {
        let data: [Item]
        let nextToken: String?

        enum CodingKeys: String, CodingKey {
            case data
            case nextToken = "next_token"
        }
    }

    /// `GET /usercollection/personal_info`
    struct PersonalInfo: Decodable {
        let id: String?
        let age: Int?
        let weight: Double?
        let height: Double?
        let biologicalSex: String?
        let email: String?

        enum CodingKeys: String, CodingKey {
            case id, age, weight, height, email
            case biologicalSex = "biological_sex"
        }
    }

    /// `GET /usercollection/daily_sleep` — daily sleep *score* + contributors (not the raw sleep data).
    struct DailySleep: Decodable {
        let id: String
        let day: String         // YYYY-MM-DD in user's timezone
        let score: Int?
        let timestamp: String?
    }

    /// `GET /usercollection/daily_readiness` — readiness score + temperature.
    struct DailyReadiness: Decodable {
        let id: String
        let day: String
        let score: Int?
        let temperatureDeviation: Double?
        let temperatureTrendDeviation: Double?
        let timestamp: String?

        enum CodingKeys: String, CodingKey {
            case id, day, score, timestamp
            case temperatureDeviation = "temperature_deviation"
            case temperatureTrendDeviation = "temperature_trend_deviation"
        }
    }

    /// `GET /usercollection/daily_activity` — steps, active calories, etc.
    struct DailyActivity: Decodable {
        let id: String
        let day: String
        let score: Int?
        let steps: Int?
        let activeCalories: Int?
        let totalCalories: Int?
        let highActivityMinutes: Int?
        let mediumActivityMinutes: Int?
        let lowActivityMinutes: Int?
        let sedentaryMinutes: Int?
        let timestamp: String?

        enum CodingKeys: String, CodingKey {
            case id, day, score, steps, timestamp
            case activeCalories = "active_calories"
            case totalCalories = "total_calories"
            case highActivityMinutes = "high_activity_minutes"
            case mediumActivityMinutes = "medium_activity_minutes"
            case lowActivityMinutes = "low_activity_minutes"
            case sedentaryMinutes = "sedentary_minutes"
        }
    }

    /// `GET /usercollection/sleep` — detailed per-session sleep data (HRV, RHR, durations).
    /// A single calendar day can have multiple sessions (nap + long sleep); we prefer `type == "long_sleep"`.
    struct SleepSession: Decodable {
        let id: String
        let day: String
        let type: String?                       // "long_sleep" | "sleep" | "rest" | "late_nap" | ...
        let bedtimeStart: String?
        let bedtimeEnd: String?
        let totalSleepDuration: Int?            // seconds
        let timeInBed: Int?                     // seconds
        let deepSleepDuration: Int?             // seconds
        let remSleepDuration: Int?              // seconds
        let lightSleepDuration: Int?            // seconds
        let averageHeartRate: Double?
        let lowestHeartRate: Int?
        let averageHrv: Int?
        let averageBreath: Double?

        enum CodingKeys: String, CodingKey {
            case id, day, type
            case bedtimeStart = "bedtime_start"
            case bedtimeEnd = "bedtime_end"
            case totalSleepDuration = "total_sleep_duration"
            case timeInBed = "time_in_bed"
            case deepSleepDuration = "deep_sleep_duration"
            case remSleepDuration = "rem_sleep_duration"
            case lightSleepDuration = "light_sleep_duration"
            case averageHeartRate = "average_heart_rate"
            case lowestHeartRate = "lowest_heart_rate"
            case averageHrv = "average_hrv"
            case averageBreath = "average_breath"
        }
    }
}
