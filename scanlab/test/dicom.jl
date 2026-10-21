@testset "Synthetic DICOM round trip" begin
    # Asymmetric values expose row/column transposition and per-image normalization.
    image = [0.0 0.1 1.25; 0.7 0.4 0.2]
    stages = String[]
    decoded, evidence = ScanLab.dicom_roundtrip(image;
        run_id="00000000-0000-4000-8000-000000000001", label="No motion",
        progress=stage->push!(stages, stage))
    @test stages == ["writing", "reopening", "verifying"]
    @test size(decoded) == size(image)
    @test maximum(abs.(image .- decoded)) <= evidence["errorBound"]
    @test evidence["maxAbsoluteError"] > 0
    @test evidence["storedPixelsExact"] === true
    @test evidence["decodedPixelHash"] == bytes2hex(sha256(JSON.json(ScanLab.pixel_rows(decoded))))
    bytes = ScanLab.base64decode(evidence["fileBase64"])
    @test evidence["fileHash"] == bytes2hex(sha256(bytes))
    @test String(bytes[129:132]) == "DICM"
    object = ScanLab.dcm_parse(IOBuffer(bytes))
    @test object[(0x0008,0x0016)] == ScanLab.SC_SOP_CLASS
    @test object[(0x0002,0x0010)] == ScanLab.EXPLICIT_LITTLE_ENDIAN
    @test object[(0x0008,0x0064)] == "SYN"
    @test strip(object[(0x0010,0x0010)]) == "PHANTOM^SYNTHETIC"
    @test object[(0x0028,0x0010)] == 2
    @test object[(0x0028,0x0011)] == 3
    @test !haskey(object, (0x0020,0x0037)) # No fabricated anatomical orientation.
    @test !haskey(object, (0x0028,0x0030)) # No unverified patient-space measurements.
    _, repeated = ScanLab.dicom_roundtrip(image; run_id="other", label="No motion")
    @test repeated["sopInstanceUid"] != evidence["sopInstanceUid"]
    @test repeated["seriesInstanceUid"] != evidence["seriesInstanceUid"]
    @test repeated["studyInstanceUid"] == evidence["studyInstanceUid"]
    @test repeated["decodedPixelHash"] == evidence["decodedPixelHash"]
    @test_throws ErrorException ScanLab.dicom_roundtrip([NaN 0; 0 1]; run_id="test", label="invalid")
    @test_throws ErrorException ScanLab.dicom_roundtrip([-1.0 0; 0 1]; run_id="test", label="invalid")

    state = ScanLab.SessionState()
    job = ScanLab.begin_run!(state, Dict("preset"=>"still"))
    ScanLab.execute_run!(state, job; compute=(preset;run_id)->Dict{String,Any}(
        "id"=>run_id, "dicom"=>evidence, "pixels"=>ScanLab.pixel_rows(decoded)))
    ScanLab.pin_baseline!(state, Dict("runId"=>job.id))
    ScanLab.snapshot(state).baseline["dicom"]["fileHash"] = "mutated"
    next = ScanLab.begin_run!(state, Dict("preset"=>"gentle"))
    ScanLab.execute_run!(state, next; compute=fake_compute)
    @test ScanLab.dicom_file(state, job.id) == bytes
    @test ScanLab.snapshot(state).baseline["dicom"]["fileHash"] == evidence["fileHash"]
    @test_throws ScanLab.ActionError ScanLab.dicom_file(state, next.id)
    @test_throws ScanLab.ActionError ScanLab.dicom_file(state, "unknown")
end
