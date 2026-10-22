# Credits and attribution

ScanLab reuses existing open-source libraries. It does not reimplement them. Versions come from
`scanlab/Manifest.toml` and `package-lock.json`. Licenses come from each package's
`LICENSE` file or package metadata.

## Libraries used at runtime

| Library | Version | Role in ScanLab | License | Credit |
|---|---|---|---|---|
| [KomaMRIBase.jl / KomaMRICore.jl](https://github.com/JuliaHealth/KomaMRI.jl) | 0.15.2 / 0.14.0 | Brain phantom, EPI sequence, CPU Bloch simulation | MIT | © 2023 Carlos Castillo Passi and contributors (JuliaHealth) |
| [MRIReco.jl](https://github.com/MagneticResonanceImaging/MRIReco.jl) | 0.9.2 | Direct image reconstruction | MIT | © 2018 Tobias Knopp and contributors |
| [DICOM.jl](https://github.com/JuliaHealth/DICOM.jl) | 0.11.0 | Writes and reopens Secondary Capture DICOM | MIT | © 2012–2019 Jeff Bezanson and contributors (JuliaHealth) |
| [HTTP.jl](https://github.com/JuliaWeb/HTTP.jl) | 1.11.0 | Local token-protected server | MIT | JuliaWeb contributors |
| [JSON.jl](https://github.com/JuliaIO/JSON.jl), SHA (Julia stdlib) | 1.11.0 / 0.7.0 | Serialization and hashes | MIT | JuliaIO and Julia contributors |

## Test tooling

| Library | Version | Role | License | Credit |
|---|---|---|---|---|
| [dicom-parser](https://github.com/cornerstonejs/dicomParser) | 1.8.21 | Independently parses the downloaded DICOM bytes in browser tests | MIT | Chris Hafey and Cornerstone contributors |
| [Playwright](https://github.com/microsoft/playwright) | 1.64.0 | Browser tests | Apache-2.0 | Microsoft |

## Simulated anatomy

ScanLab's phantom is KomaMRI's `brain_phantom2D`, which ships inside KomaMRIBase
(`src/datatypes/phantom/brain2D.mat`, MIT). It is derived from the
[BrainWeb](https://brainweb.bic.mni.mcgill.ca/brainweb/) simulated brain database
(McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University).
This is a published digital phantom, not a patient record. Please cite:

- B. Aubert-Broche, D. L. Collins, A. C. Evans, "A new improved version of the
  realistic digital brain phantom," *NeuroImage* 32(1), 2006.
- B. Aubert-Broche, M. Griffin, G. B. Pike, A. C. Evans, D. L. Collins, "Twenty new
  digital brain phantoms for creation of validation image data bases,"
  *IEEE Trans. Med. Imaging* 25(11), 2006.
- C. A. Cocosco, V. Kollokian, R. K.-S. Kwan, A. C. Evans, "BrainWeb: Online
  Interface to a 3D MRI Simulated Brain Database," *NeuroImage* 5(4), 1997.
- C. Castillo-Passi et al., "KomaMRI.jl: an open-source framework for general MRI
  simulations with GPU acceleration," *Magnetic Resonance in Medicine* 90(1), 2023.

## Product research (no code or assets copied)

The workbench layout was informed by publicly documented features of
[OHIF Viewer](https://ohif.org/) (linked viewports, windowing, and hanging protocols),
[Orthanc](https://www.orthanc-server.com/) (a lightweight DICOM server and REST
access), and commercial reading workstations. ScanLab is not affiliated with these
projects and does not claim equivalence to them.

The DICOM standard is published by [NEMA](https://www.dicomstandard.org/). ScanLab does
not claim conformance certification.

## Reference datasets (evaluated, not bundled)

ScanLab ships no external image files. Its only image source is the BrainWeb-derived
phantom that the pinned KomaMRI library bundles (see above). The live experiment
remains limited to that fixed phantom. A separate reference image is not bundled.

| Candidate | Description | License | Status |
|---|---|---|---|
| [BrainWeb Normal Brain Database](https://brainweb.bic.mni.mcgill.ca/brainweb/selection_normal.html) | Three-dimensional simulated T1-, T2- and PD-weighted brain volumes with selectable noise and slice-thickness variants | The reviewed pages request citation but do not establish redistribution terms | Best fit for a synthetic visual reference; not downloaded or bundled pending terms review |
| [pydicom-data](https://github.com/pydicom/pydicom-data) `MR_small.dcm` | 64×64 MR slice, downsized from NEMA WG-04 `MR1_UNC`; patient-like names replaced | Repository is MIT, © 2020 Dicom in Python. The file notes say "no restriction" is believed | Not selected; BrainWeb is a closer synthetic visual reference |
| [TCIA Phantom FDA](https://www.cancerimagingarchive.net/collection/phantom-fda/) | CT of a physical anthropomorphic chest phantom; no human subjects | See the TCIA collection page; citation required | Large; not evaluated further |
| Hugging Face [`ndonyapour/dicom-sample-files`](https://huggingface.co/datasets/ndonyapour/dicom-sample-files) | 10–40 MB CT/MR archives | MIT tag; provenance unclear | Rejected |
| Hugging Face `UniqueData/dicom-brain-dataset`, `AIxBlock/MRI-brain-cancer-dicom-100-plus-patients` | Brain MRI sets | Non-commercial (CC BY-NC variants) | Rejected |

If a reference study is approved, record its source URL, checksum, license text, required
citation, and de-identification notes here before you use it.

## Request desk libraries and data

The [request desk](request-desk.md) uses a separate set of Julia packages, pinned in the root
`Project.toml` and `Manifest.toml`.

| Library | Version | Role | License | Credit |
|---|---|---|---|---|
| [HealthSampleData.jl](https://github.com/JuliaHealth/HealthSampleData.jl) | 0.0.1 | Downloads the synthetic Eunomia dataset with a checksum | MIT | © 2022 Jacob Zelko and Georgia Tech Research Institute |
| [OMOPCDMCohortCreator.jl](https://juliahealth.org/OMOPCDMCohortCreator.jl/stable/tutorials/beginner_tutorial/) | 0.5.1 | The existing person and cohort queries | MIT | © 2022 Jacob Zelko and Georgia Tech Research Institute |
| [SQLite.jl](https://juliadatabases.org/SQLite.jl/stable/) | 1.9.0 | Reads the dataset | MIT | © 2014 Jacob Quinn and contributors |
| [HTTP.jl](https://github.com/JuliaWeb/HTTP.jl), [JSON.jl](https://github.com/JuliaIO/JSON.jl) | 1.11.0 / 1.11.0 | Local server and strict JSON | MIT | JuliaWeb and JuliaIO contributors |

JSON3.jl was tried first, but its reader accepted trailing text after a valid object. The
request desk uses JSON.jl's strict root parser instead.

### The dataset

The data is Eunomia, a small synthetic OMOP sample generated with Synthea.
[OHDSI Eunomia](https://github.com/OHDSI/Eunomia) manages it, and
[EunomiaDatasets](https://github.com/OHDSI/EunomiaDatasets) publishes an Apache-2.0 license.
This repository does not redistribute the database or vendor any upstream source. Setup
downloads the upstream artifact through DataDeps and checks its SHA-256
(`cef9f00fe469041cfcdec527fc6f5657e2d0185bc002df38262faa642ee97c82`) before the database opens.
The snapshot has 2,694 people, and 1,677 distinct people have a condition record for tutorial
concept 28060.

A package license does not grant blanket rights to every medical dataset or terminology. Check
the terms of any other data before you use it here.

HealthSampleData's default upstream branch had a different package UUID from its registered
release, so resolution failed at first. The project pins the registered release from the General
registry. No fork or patch was used.
