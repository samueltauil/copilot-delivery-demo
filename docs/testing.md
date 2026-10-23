# Testing

The tests prove ScanLab's claims by computing real results. They use practice
data only and start their own local servers on `127.0.0.1`. If a test fails,
report the failure. Never skip or loosen a check to make a demo pass.

## Run the tests

Set up once: `npm ci`, `npx playwright install chromium`, then
`npm run scanlab:setup` (ScanLab) or `npm run setup` (request desk). A missing
prerequisite is a failed result, not a reason to skip a test.

| Command | What it runs | Takes about |
|---|---|---|
| `npm run scanlab:check` | Every ScanLab test: Julia, Node and browser | About 110 minutes |
| `npm run scanlab:test` | ScanLab Julia and Node tests | About 35 minutes |
| `npm run scanlab:e2e` | ScanLab browser tests, including startup | About 75 minutes |
| `npm run check` | Every request desk test: Julia, Node and browser | 2 minutes |
| `npm run check:all` | Both of the above | About 112 minutes |
| `node --test test/*.test.js scanlab/test/*.test.js` | Every Node test. No Julia or browser needed | 10 seconds |

Full-detail acquisitions take several minutes each. Scan-completion assertions
allow up to 15 minutes per acquisition, without changing responsiveness or
pixel-integrity thresholds. Startup rehearses two acquisitions before the
browser suite begins. The times are rough, from a Windows development machine after setup. While you
fix something, run one part on its own:

```powershell
node scripts/scanlab.js test
node --test scanlab/test/story.test.js
npx playwright test --config=scanlab/playwright.config.js -g "reference never changes"
```

The first line runs only the ScanLab Julia tests, the second one Node test file,
the third one browser test. Browser tests run one at a time with no retries, so a
flaky test shows up instead of hiding. Their output goes to `test-results/`,
which Git ignores.

## What the ScanLab tests prove

| Suite | Files | What it proves |
|---|---|---|
| Julia: imaging | `scanlab/test/science.jl` | Each of the three motion presets runs the real KomaMRI and MRIReco code and gives a finite 384 × 384 picture from 103,964 native phantom points. The acquisition stays below the spin grid's spatial sampling limit. The same preset gives the same picture again, in a new run. How far each preset changes the picture is pinned. An independent, single-threaded call to the libraries gives the same pixels |
| Julia: runs and the reference | `scanlab/test/state.jl` | Bad input is refused. Only one scan runs at a time. The reference never changes after later scans or a failed scan, and a failure says so. Every run computes; nothing is replayed. The activity list names who did what, and unknown names are refused |
| Julia: DICOM file | `scanlab/test/dicom.jl` | A saved file reads back to the same picture within a measured rounding error. It is a Secondary Capture marked synthetic, with no invented orientation or pixel spacing. Each save gets new IDs. The reference file's bytes never change |
| Julia: service | `scanlab/test/server.jl` | Routes, methods, the session token and origin checks. A running scan never freezes the server. The start-up rehearsal leaves no result behind |
| Node: page wording | `scanlab/test/story.test.js` | The steps, buttons, hints and percentages on the page tell the truth about what has happened |
| Node: Canvas adapter | `scanlab/test/canvas.test.js`, `scanlab/test/launcher.test.js` | The six Canvas actions and their errors, the bounded command-line bridge, connection details that cannot be redirected, and a start-up lock that never overwrites another one |
| Node: coding exercise | `scanlab/test/teaching.test.js` | The start snapshot leaves out only the compare step and restores exactly |
| Browser | `scanlab/e2e/scanlab.spec.js` | The real page in Chromium, listed below |

The browser tests check that:

- a fresh start shows no preloaded result;
- scan, keep a reference, scan again leaves the reference unchanged, and the same
  movement twice gives the same picture in a new file;
- the downloaded `.dcm` file matches the page. A separate JavaScript DICOM reader
  (`dicom-parser`) opens the file DICOM.jl wrote, checks its class, IDs, size and
  bit depth, and compares every pixel with the page. Downloading without the
  session token is refused;
- zoom, pan, brightness and contrast move every image together, and Slide and
  What changed use the same two scans;
- a running scan answers at once, a quick second click is queued, and keeping a
  reference answers at once even when the server is slow;
- Copilot's actions appear live and are labelled as Copilot's, and the prompts and
  the pull request note copy to the clipboard;
- failures are explicit: a failed scan, a failed download, a lost connection, a
  missing session token and an older service;
- keyboard users can skip to the images, the page fits at 1440, 1024, 768, 520
  and 390 px without sideways scrolling, and every button, menu and link on a
  phone is at least 40 px tall.

## What the request desk tests prove

| Suite | Files | What it proves |
|---|---|---|
| Julia | `test/requests.jl`, `test/server.jl`, `test/study.jl` | The request store and name rule, the HTTP API, and the study summary from the checksum-pinned dataset. A missing or altered dataset fails clearly |
| Node | `test/julia-launcher.test.js`, `test/prepare-local-demo.test.js`, `test/prepare-web-demo.test.js` | The Julia launcher, the isolated snapshots for the coding exercises, and the local issue and pull request drafts |
| Browser | `e2e/request-submission.spec.js`, `e2e/study.spec.js` | The form with accessible error messages, and the study card at 1280 px and 390 px. A failed study request shows an error, never invented counts |

## Results

The **384 × 384** ScanLab run completed on 23 October 2026 on Windows with
Julia 1.10.12, Node 22.20.0 and Playwright 1.64.0 (Chromium).
`npm run scanlab:check` exited 0 in about 110 minutes. Everything passed and
nothing was skipped. The separate request desk rows retain their passing
22 October results; that exercise was not changed or re-run for this upgrade.

| Suite | Passed | Test time |
|---|---|---|
| ScanLab Julia: imaging | 76 of 76 | 34 min 38 s |
| ScanLab Julia: runs and the reference | 47 of 47 | 1.3 s |
| ScanLab Julia: activity and change measurements | 40 of 40 | 0.3 s |
| ScanLab Julia: DICOM file | 26 of 26 | 0.8 s |
| ScanLab Julia: service | 82 of 82 | 18.4 s |
| ScanLab Node | 38 of 38 | 2.3 s |
| ScanLab browser | 23 of 23 | About 1 hour, plus startup |
| Request desk Julia: request store | 39 of 39 | 0.8 s |
| Request desk Julia: HTTP API | 84 of 84 | 21.7 s |
| Request desk Julia: study | 14 of 14 | 9.5 s |
| Request desk Node | 7 of 7 | 7.0 s |
| Request desk browser | 11 of 11 | 33.6 s |

Julia counts individual checks. Node and browser counts are whole tests. This is
a record of one run, not a promise. Run the commands yourself before you present.

The HTTP.jl log included idle-connection timeout warnings and one canceled
client write (`ECANCELED`). No assertion failed; this was not a warning-free run.

The five README screenshots were captured from that live browser-test session,
without starting additional scans or replaying saved images. The reference
remained identical across the capture, including its pixels, parameters and
DICOM bytes:

| Screenshot evidence | Value |
|---|---|
| No motion reference run | `29bdb5bd-6544-4fbd-81c8-7aba8dc57109` |
| Controlled shift run | `3e9c51c3-cad7-4d49-beda-648d61ebb9a6` |
| Reference file SHA-256 | `a1da2de2263336a063232b39c96089027b575167579667e0e15ee210117d3b6a` |
| Reference decoded-pixel SHA-256 | `e16b0a3414edbeac91d8a64dcc9a119d4ebb26c0b778a66a7c97217ba89c2537` |

## What has not been verified

- **The GitHub Copilot app window.** The Canvas is tested through its adapter and
  through the same web page it shows. The host app blocks desktop automation of
  itself, so no test or recording drives the Copilot app. A person has to open the
  canvas, run No motion, keep the reference and run Controlled shift. The
  README screenshots are browser captures. Their "Copilot" entries use the local
  API's self-reported actor label, not a live Copilot session or Canvas action.
- **Screen readers.** The tests cover keyboard access, a skip link and tap size.
  They do not replace a pass with a screen reader.
- **Clinical meaning.** The numbers describe a simulated picture of a published
  phantom. They say nothing about patient scans. The saved file is a derived
  Secondary Capture. No DICOM conformance check has been run, and none is claimed.
- **A real MR study.** None is included, so ScanLab has never opened one. See
  [Credits](credits.md#reference-datasets-evaluated-not-bundled) for the
  candidates.
- **Who acted.** "You", "Copilot" and "A script" are labels the caller sends about
  itself. The tests check that they are shown and that unknown names are refused.
  They do not prove who acted.
- **Other systems.** Only Windows has been tested. The commands here are
  PowerShell, and the workflow uses `windows-latest`.
- **GitHub Actions.** `.github/workflows/julia-demo.yml` runs `npm run check` and
  `npm run scanlab:check` on pull requests and by hand, with a 25-minute limit. It
  has not run on GitHub yet, so its first hosted result is unknown. A fresh runner
  must also install and compile every Julia package first, so the limit may turn
  out to be too tight.
