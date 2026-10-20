const DATASET_SHA256 = "cef9f00fe469041cfcdec527fc6f5657e2d0185bc002df38262faa642ee97c82"
const CONDITION_CONCEPT_ID = 28060
const DEFAULT_DATA_PATH = joinpath(@__DIR__, "..", ".demo-runs", "data", "Eunomia", "eunomia.sqlite")

data_path() = get(ENV, "DEMO_DATA_PATH", DEFAULT_DATA_PATH)

function summarize_study(db::SQLite.DB)
    DBInterface.execute(db, "PRAGMA query_only=ON")
    with_logger(ConsoleLogger(stderr, Logging.Warn)) do
        OCC.GenerateDatabaseDetails(:sqlite, "main")
        OCC.GenerateTables(db)
    end
    people = OCC.GetDatabasePersonIDs(db)
    cohort = OCC.ConditionFilterPersonIDs([CONDITION_CONCEPT_ID], db)
    return (
        dataset = "Eunomia",
        synthetic = true,
        conditionConceptId = CONDITION_CONCEPT_ID,
        condition = "Strep throat (tutorial cohort)",
        totalPeople = length(unique(people)),
        cohortPeople = length(unique(cohort.person_id)),
    )
end

function load_study(path::AbstractString = data_path())
    isfile(path) || error("Synthetic Eunomia dataset is missing. Run npm run setup before starting the demo.")
    bytes2hex(open(sha256, path)) == DATASET_SHA256 ||
        error("Eunomia checksum mismatch. Only the pinned synthetic dataset is permitted; rerun setup with a clean data cache.")
    db = SQLite.DB(path)
    try
        return summarize_study(db)
    finally
        close(db)
    end
end
