const SC_SOP_CLASS = "1.2.840.10008.5.1.4.1.1.7"
const EXPLICIT_LITTLE_ENDIAN = "1.2.840.10008.1.2.1"
const SYNTHETIC_STUDY_UID = "2.25.$(uuid4().value)"
const DICOM_IMPLEMENTATION_UID = "2.25.314159265358979323846264338327950288"

dicom_uid() = "2.25.$(uuid4().value)"
pixel_rows(image) = [collect(row) for row in eachrow(image)]

function dicom_roundtrip(image; run_id, label, progress=(_)->nothing)
    all(isfinite, image) && all(>=(0), image) ||
        error("DICOM export requires finite nonnegative magnitude pixels.")
    rows, columns = size(image)
    1 < rows <= 65535 && 1 < columns <= 65535 ||
        error("DICOM export requires a supported two-dimensional image.")
    progress("writing")
    # Preserve arbitrary-unit range, not per-image display normalization.
    slope_text = @sprintf("%.10g", max(1.0, Float64(maximum(image))) / 65535)
    slope = parse(Float64, slope_text)
    stored = round.(UInt16, Float64.(image) ./ slope)
    stamp = now(UTC)
    sop_uid, series_uid = dicom_uid(), dicom_uid()
    meta = Dict{Tuple{UInt16,UInt16},Any}(
        (0x0002,0x0001)=>UInt8[0,1], (0x0002,0x0002)=>SC_SOP_CLASS,
        (0x0002,0x0003)=>sop_uid, (0x0002,0x0010)=>EXPLICIT_LITTLE_ENDIAN,
        (0x0002,0x0012)=>DICOM_IMPLEMENTATION_UID, (0x0002,0x0013)=>"SCANLAB_1",
    )
    dataset = DICOM.DICOMData(meta, :little, true, Dict{Tuple{UInt16,UInt16},String}())
    meta_io = IOBuffer()
    dcm_write(meta_io, dataset; preamble=false)
    meta[(0x0002,0x0000)] = UInt32(position(meta_io))
    merge!(meta, Dict{Tuple{UInt16,UInt16},Any}(
        (0x0008,0x0008)=>["DERIVED","SECONDARY"], (0x0008,0x0016)=>SC_SOP_CLASS,
        (0x0008,0x0018)=>sop_uid, (0x0008,0x0020)=>Dates.format(stamp,"yyyymmdd"),
        (0x0008,0x0030)=>Dates.format(stamp,"HHMMSS"), (0x0008,0x0050)=>"",
        (0x0008,0x0060)=>"OT", (0x0008,0x0064)=>"SYN",
        (0x0008,0x0070)=>"ScanLab synthetic research", (0x0008,0x0090)=>"",
        (0x0008,0x1030)=>"SYNTHETIC phantom - not for clinical use",
        (0x0008,0x103e)=>"SYNTHETIC $label",
        (0x0008,0x2111)=>"CPU simulated phantom; run $run_id. Quantized magnitude, arbitrary units.",
        (0x0010,0x0010)=>"PHANTOM^SYNTHETIC", (0x0010,0x0020)=>"SCANLAB-SYNTHETIC",
        (0x0010,0x0030)=>"", (0x0010,0x0040)=>"",
        (0x0018,0x1016)=>"ScanLab", (0x0018,0x1018)=>"Image Integrity Workbench",
        (0x0018,0x1019)=>"1",
        (0x0020,0x000d)=>SYNTHETIC_STUDY_UID, (0x0020,0x000e)=>series_uid,
        (0x0020,0x0010)=>"SYNTHETIC", (0x0020,0x0011)=>[1], (0x0020,0x0013)=>[1],
        (0x0020,0x0020)=>"",
        (0x0028,0x0002)=>UInt16(1), (0x0028,0x0004)=>"MONOCHROME2",
        (0x0028,0x0010)=>UInt16(rows), (0x0028,0x0011)=>UInt16(columns),
        (0x0028,0x0034)=>[1,1],
        (0x0028,0x0100)=>UInt16(16), (0x0028,0x0101)=>UInt16(16),
        (0x0028,0x0102)=>UInt16(15), (0x0028,0x0103)=>UInt16(0),
        (0x0028,0x1050)=>[0.5], (0x0028,0x1051)=>[1.0],
        (0x0028,0x1052)=>[0.0], (0x0028,0x1053)=>[slope_text],
        (0x0028,0x1054)=>"US", (0x0028,0x2110)=>"00",
        (0x7fe0,0x0010)=>stored,
    ))
    io = IOBuffer()
    dcm_write(io, dataset)
    bytes = take!(io)
    progress("reopening")
    reopened = dcm_parse(IOBuffer(bytes))
    progress("verifying")
    decoded = reopened[(0x7fe0,0x0010)]
    size(decoded) == size(image) && decoded == stored ||
        error("DICOM round trip changed stored pixels or their orientation.")
    for tag in ((0x0008,0x0016), (0x0008,0x0018), (0x0020,0x000d), (0x0020,0x000e),
                (0x0028,0x0010), (0x0028,0x0011), (0x0028,0x0100), (0x0028,0x1053))
        expected = tag == (0x0028,0x1053) ? slope : meta[tag]
        reopened[tag] == expected || error("DICOM round trip changed required metadata $tag.")
    end
    restored = Float64.(decoded) .* reopened[(0x0028,0x1053)] .+ reopened[(0x0028,0x1052)]
    max_error = maximum(abs.(restored .- image))
    bound = slope / 2 + eps(Float64) * max(1.0, maximum(image))
    max_error <= bound || error("DICOM quantization exceeded the half-step error bound.")
    tags = [
        (tag="0008,0016", name="SOP class", value=SC_SOP_CLASS),
        (tag="0008,0060", name="Modality", value="OT (derived synthetic image)"),
        (tag="0008,0064", name="Conversion type", value="SYN"),
        (tag="0010,0010", name="Synthetic subject", value="PHANTOM^SYNTHETIC"),
        (tag="0020,000D", name="Study UID", value=reopened[(0x0020,0x000d)]),
        (tag="0020,000E", name="Series UID", value=reopened[(0x0020,0x000e)]),
        (tag="0008,0018", name="Instance UID", value=reopened[(0x0008,0x0018)]),
        (tag="0028,0010/0011", name="Rows / columns", value="$rows / $columns"),
        (tag="0028,0100", name="Pixel representation", value="16-bit unsigned / MONOCHROME2"),
        (tag="0028,1053", name="Rescale slope", value=slope_text),
        (tag="0002,0010", name="Transfer syntax", value=EXPLICIT_LITTLE_ENDIAN),
    ]
    evidence = Dict{String,Any}(
        "sopClass"=>"Secondary Capture Image Storage", "sopInstanceUid"=>sop_uid,
        "seriesInstanceUid"=>series_uid, "studyInstanceUid"=>SYNTHETIC_STUDY_UID,
        "transferSyntax"=>EXPLICIT_LITTLE_ENDIAN, "bitsStored"=>16,
        "rescaleSlope"=>slope, "rescaleIntercept"=>0, "intensityUnit"=>"arbitrary units",
        "storedPixelsExact"=>true, "maxAbsoluteError"=>max_error, "errorBound"=>bound,
        "fileHash"=>bytes2hex(sha256(bytes)), "byteLength"=>length(bytes),
        "decodedPixelHash"=>bytes2hex(sha256(JSON.json(pixel_rows(restored)))),
        "fileBase64"=>base64encode(bytes), "tags"=>tags,
        "validation"=>"DICOM.jl write/read and runtime invariants; not a conformance certification",
    )
    restored, evidence
end
