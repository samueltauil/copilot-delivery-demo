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

ScanLab ships no external image files. Its only image source is the BrainWeb-derived phantom that
the pinned KomaMRI library bundles (see above).
These candidates were reviewed for a possible read-only reference study. None is included,
because adding one would expand the approved synthetic-only scope.

| Candidate | Description | License | Status |
|---|---|---|---|
| [pydicom-data](https://github.com/pydicom/pydicom-data) `MR_small.dcm` | 64×64 MR slice, downsized from NEMA WG-04 `MR1_UNC`; patient-like names replaced | Repository is MIT, © 2020 Dicom in Python. The file notes say "no restriction" is believed | Preferred candidate; awaiting approval |
| [TCIA Phantom FDA](https://www.cancerimagingarchive.net/collection/phantom-fda/) | CT of a physical anthropomorphic chest phantom; no human subjects | See the TCIA collection page; citation required | Large; not evaluated further |
| Hugging Face [`ndonyapour/dicom-sample-files`](https://huggingface.co/datasets/ndonyapour/dicom-sample-files) | 10–40 MB CT/MR archives | MIT tag; provenance unclear | Rejected |
| Hugging Face `UniqueData/dicom-brain-dataset`, `AIxBlock/MRI-brain-cancer-dicom-100-plus-patients` | Brain MRI sets | Non-commercial (CC BY-NC variants) | Rejected |

If a reference study is approved, record its source URL, checksum, license text, required
citation, and de-identification notes here before you use it.
