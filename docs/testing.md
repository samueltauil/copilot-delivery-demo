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
| `npm run scanlab:check` | Every ScanLab test: Julia, Node and browser | About 18 minutes |
| `npm run scanlab:test` | ScanLab Julia and Node tests | About 6 minutes |
| `npm run scanlab:e2e` | ScanLab browser tests | About 11 minutes |
| `npm run check` | Every request desk test: Julia, Node and browser | 2 minutes |
| `npm run check:all` | Both of the above | About 20 minutes |
| `node --test test/*.test.js scanlab/test/*.test.js` | Every Node test. No Julia or browser needed | 10 seconds |

The times are rough, from a Windows development machine after setup. While you
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
| Julia: imaging | `scanlab/test/science.jl` | Each of the three motion presets runs the real KomaMRI and MRIReco code and gives a finite 192 × 192 picture. The same preset gives the same picture again, in a new run. How far each preset changes the picture is pinned. An independent, single-threaded call to the libraries gives the same pixels |
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

Results from 22 October 2026 on Windows with Julia 1.10.12, Node 22.20.0 and
Playwright 1.64.0 (Chromium). Everything passed and nothing was skipped.

| Suite | Passed | Test time |
|---|---|---|
| ScanLab Julia: imaging | 70 of 70 | 4 min 30 s |
| ScanLab Julia: runs and the reference | 47 of 47 | 1.8 s |
| ScanLab Julia: activity and change measurements | 40 of 40 | 0.4 s |
| ScanLab Julia: DICOM file | 26 of 26 | 1.2 s |
| ScanLab Julia: service | 82 of 82 | 24.6 s |
| ScanLab Node | 38 of 38 | 3.8 s |
| ScanLab browser | 23 of 23 | 11.3 min |
| Request desk Julia: request store | 39 of 39 | 0.8 s |
| Request desk Julia: HTTP API | 84 of 84 | 21.7 s |
| Request desk Julia: study | 14 of 14 | 9.5 s |
| Request desk Node | 7 of 7 | 7.0 s |
| Request desk browser | 11 of 11 | 33.6 s |

Julia counts individual checks. Node and browser counts are whole tests. This is
a record of one run, not a promise. Run the commands yourself before you present.

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
