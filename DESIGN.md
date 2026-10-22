# ScanLab workbench

## Scene and hierarchy

An engineer presents a synthetic image-integrity experiment on a shared screen
inside Copilot or a browser, with people in the room who are not imaging
specialists. The identity is a dark reading room: near-black chrome so the
grayscale images are the brightest, most important things on screen. There is
no marketing hero.

Order of attention, top to bottom: a four-step strip (Take a scan, Keep it as
your reference, Scan again with movement, See what changed) with one line that
says what to do next; the scan controls with the real stage chips; the images
and their three ways to compare; then, beside them, **What changed** and
**Work with Copilot**; then **File check**; then a closed **Technical details**
area.

## System

Use the Segoe UI Variable system stack for everything except identifiers,
fingerprints and numbers, which use Cascadia Mono/Consolas. Surfaces: page
#0b0e13, panels #12171e, raised controls #19202a, image fields #050608. Text
#e8edf4, secondary #a9b4c4, tertiary #8593a6; every text color keeps at least
4.5:1 contrast on its surface. Cyan #5cc8ff marks the primary action and the
current step; green #4ed08a, amber #f0b95a and red #ff7b72 are reserved for
good, caution and error, and always come with words. Violet #b69cff belongs to
Copilot only (its card, its prompts, its entries in the activity list). Amber
#f2ca7e is keyboard focus. Corners are modest; panels are never nested inside
panels, and there are no gradient text, glass effects, icon-over-heading card
grids or thick colored side borders.

## Behavior

- **Instant answers.** A click is acknowledged at once: Take scan becomes
  Scanning…, Keep as reference becomes Keeping…, and the old image stays labeled
  as the previous scan until a new result really arrives. Actions are queued in
  order, so a quick second click is never lost.
- **Real progress.** The stage chips (Simulate the scan, Save as DICOM file,
  Open the file again, Check every pixel) follow the stage the server reports.
- **Three ways to compare.** Side by side, Slide and What changed. A new
  comparison opens on What changed unless the person already chose a view.
  Zoom, pan, brightness and contrast act on every image together. Image frames
  take arrow keys to pan, `=` and `-` to zoom and `0` to reset; the slide handle
  takes arrows, Shift, Home and End.
- **Plain words.** Rows read "Picture changed", "Average change", "Biggest
  change"; the file check reads "Saved file checks out". Fingerprints and DICOM
  tags sit inside the closed Technical details with a one-line explanation.
- **Copilot is part of the page.** Suggested prompts follow the current step and
  copy with one click; the activity list names who did what (You, Copilot, A
  script); **Copy pull request note** and a preview produce the evidence text.
- **Honest states.** Loading, disconnected, failed and busy are different. A
  disconnected page disables every action and says so; a failed scan says it
  failed and never shows an older image as new.

## Responsive and accessible

At 1200 px and wider the page has two columns with a 360 px aside. Below 900 px
it is one column and the presets stack. Below 700 px the step strip becomes four
progress bars with one visible line, "Step N of 4 · …", while the step names stay
available to screen readers. On touch screens every control is at least 44 px
tall. Controls keep labels and a visible focus ring; a skip link jumps to the
images; errors use an alert and status uses a polite live region. Motion is
limited to short feedback and is removed when the person asks for reduced motion.
