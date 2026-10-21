# ScanLab workbench

## Scene and hierarchy

An engineer presents a synthetic image-integrity experiment on a shared screen
inside Copilot or a browser. Black image fields preserve grayscale comparison;
neutral slate chrome separates controls from image data without cinematic effects.
The acquisition action and real status come first, followed by the paired images,
linked viewing controls, and an inline inspector. There is no marketing hero.

## System

Use the system Segoe UI/sans-serif stack for controls and explanations. Use
monospace only for identifiers, hashes and numerical provenance. Main surfaces
are #171b22 and #202630, image fields #050608, text #e5e9ef, secondary text
#aeb8c7, dividers #39414f. Blue #8dbbff marks the primary action and selected
inspector tab; amber #f2ca7e is keyboard focus. Errors have explicit text.
Controls have restrained 4px corners; viewports are contiguous, not cards.

## Behavior

The series rail identifies only current and pinned acquisitions, not an archive.
Viewports display DICOM-decoded pixels. Full run IDs remain visible beneath
images, and the inspector exposes full hashes. Shared zoom, pan and window/level
operate in identical coordinates/intensity units. Reset restores all controls.
Inspector tabs support arrows, Home and End. Loading, disconnection and failed
runs are distinct; earlier completed images retain their identity.

## Responsive and accessible

At narrow widths the decorative study rail is removed and reference/current
viewports stack in reading order. Toolbars wrap and metadata breaks at long
identifiers. Controls retain labels and visible focus, errors use an alert,
and status uses a polite live region. No automatic animation is required.
