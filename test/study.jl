@testset "JuliaHealth study" begin
    @testset "distinct people, not condition records" begin
        db = SQLite.DB()
        try
            DBInterface.execute(db, "CREATE TABLE person (person_id INTEGER)")
            DBInterface.execute(db, "CREATE TABLE condition_occurrence (person_id INTEGER, condition_concept_id INTEGER)")
            DBInterface.execute(db, "INSERT INTO person VALUES (1), (2), (3)")
            DBInterface.execute(db, "INSERT INTO condition_occurrence VALUES (1, 28060), (1, 28060), (2, 28060), (3, 999)")
            study = ResearchDesk.summarize_study(db)
            @test study.totalPeople == 3
            @test study.cohortPeople == 2
            @test study.synthetic
            @test_throws SQLite.SQLiteException DBInterface.execute(db, "DELETE FROM person")
        finally
            close(db)
        end
    end

    @testset "missing or untrusted data fails explicitly" begin
        mktempdir() do directory
            missing = joinpath(directory, "missing.sqlite")
            @test_throws ErrorException ResearchDesk.load_study(missing)
            @test !isfile(missing)
            bad = joinpath(directory, "invalid.sqlite")
            write(bad, "not the pinned synthetic dataset")
            @test_throws ErrorException ResearchDesk.load_study(bad)
        end
    end

    @testset "pinned Eunomia integration" begin
        path = ResearchDesk.data_path()
        study = ResearchDesk.load_study(path)
        @test study.totalPeople == 2694
        @test study.cohortPeople == 1677
        @test study.conditionConceptId == 28060
        @test Set(keys(study)) == Set([:dataset, :synthetic, :conditionConceptId, :condition, :totalPeople, :cohortPeople])
        db = SQLite.DB(path)
        try
            row = first(DBInterface.execute(db, "SELECT COUNT(DISTINCT person_id) AS people, COUNT(*) AS records FROM condition_occurrence WHERE condition_concept_id=28060"))
            @test study.cohortPeople == row.people
            @test row.records > study.cohortPeople
        finally
            close(db)
        end
        @test bytes2hex(open(sha256, path)) == ResearchDesk.DATASET_SHA256
    end
end
