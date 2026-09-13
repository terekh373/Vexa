Issue #8 CI cleanup

Copy these 3 files over the same paths in your local feature/8-course-page branch:
- apps/api/src/app.ts
- docs/frontend-api-map.md
- packages/shared/src/index.ts

Then delete these two accidentally-added files from the local repository:
- docs/#U0422#U0435#U0445#U043d#U0456#U0447#U043d#U0435_#U0437#U0430#U0432#U0434#U0430#U043d#U043d#U044f_Vexa.docx
- docs/#U0422#U0435#U0445#U043d#U0456#U0447#U043d#U0435_#U0437#U0430#U0432#U0434#U0430#U043d#U043d#U044f_Vexa.pdf

Expected GitHub Desktop changes after that: exactly 5 files (3 modified, 2 deleted).
Suggested commit:
fix: restore develop shared exports and API routes
