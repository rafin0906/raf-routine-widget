# Raf Routine 🗓️

A home-screen **class-routine widget** for Android, built with **React Native CLI** + a native **Jetpack Glance** widget.

The widget shows, at a glance:
- **NOW** — the class you're in, with a live progress bar and "minutes left"
- **NEXT** — what's coming up and in how long
- **Today** — your full timeline with DONE / LIVE / SOON status
- **Important** — cancellations and deadlines
- **Weekly Highlights** — tests, quizzes, assignments, vivas, finals

A small companion app lets you preview the widget, push data to it, and reset to sample data.

---

## How it works

```
 React Native app (TypeScript)            Android native (Kotlin)
 ┌───────────────────────────┐  JSON     ┌──────────────────────┐   ┌─────────────┐
 │ sample data + AsyncStorage│ ────────► │ RafRoutineWidget      │ ─►│ DataStore   │
 │ live preview + buttons    │  bridge   │ native module         │   │ routine_json│
 └───────────────────────────┘           └──────────┬───────────┘   └──────┬──────┘
                                                     │ updateAll()          │ read
                                                     ▼                      ▼
                                        ┌─────────────────────────────────────────┐
                                        │ RafRoutineWidget : GlanceAppWidget        │
                                        │ parse JSON → compute live state → render  │
                                        └─────────────────────────────────────────┘
```

**Key idea:** the *content* (classes, notices, highlights) is stored data, but the *live state* (which class is NOW, progress %, "39m left", DONE/LIVE/SOON, "Updated 5 min ago") is **computed from the device clock every time the widget renders** — so it stays correct even when the app isn't open.

The JS side and the native side share one **contract** (the JSON shape + the `RafRoutineWidget` native-module API). See [`src/types/routine.ts`](src/types/routine.ts) and [`android/app/src/main/java/com/rafroutine/widget/model/RoutineModel.kt`](android/app/src/main/java/com/rafroutine/widget/model/RoutineModel.kt) — they mirror each other.

---

## Prerequisites

- **Node.js** ≥ 18 (developed on Node 24)
- **JDK 17**
- **Android Studio** + **Android SDK** (Platform 35, Build-Tools 35.0.0) and an emulator or a USB device
- A working React Native Android environment — see https://reactnative.dev/docs/environment-setup (choose "React Native CLI").

> This project targets **React Native 0.76.6**, **Kotlin 1.9.24**, **Glance 1.1.0**, `minSdk 26 / compile&target 35`, **old architecture** (`newArchEnabled=false`).

---

## Setup

This repo contains **all source and config**, but intentionally **not** the few binary/boilerplate files that the React Native template must generate (the Gradle wrapper JAR, the launcher icons, and the debug keystore). Fetch them once from a fresh template:

**1. Generate a throwaway baseline (same RN version):**
```bash
npx @react-native-community/cli@latest init RafRoutineBase --version 0.76.6 --skip-install
```

**2. Copy these generated items from `RafRoutineBase/android/` into this project's `android/`** (only the binaries/icons — keep *our* `.gradle`, manifest, and Kotlin files):
```
RafRoutineBase/android/gradlew                       → android/gradlew
RafRoutineBase/android/gradlew.bat                   → android/gradlew.bat
RafRoutineBase/android/gradle/wrapper/gradle-wrapper.jar → android/gradle/wrapper/gradle-wrapper.jar
RafRoutineBase/android/app/debug.keystore            → android/app/debug.keystore
RafRoutineBase/android/app/src/main/res/mipmap-*     → android/app/src/main/res/   (all mipmap-* folders)
```
Then you can delete `RafRoutineBase`.

**3. Install JS dependencies (in this project):**
```bash
npm install
```

**4. Run it:**
```bash
npm run android        # or: npx react-native run-android
```
Keep the Metro bundler running (it starts automatically; or `npm start` in a separate terminal).

> Prefer to start from scratch instead? Run `react-native init`, then copy this repo's `App.tsx`, `src/`, the `com/rafroutine/widget` + `bridge` + `data` Kotlin packages, the `res/` widget files, and apply the three edits in [`AndroidManifest.xml`](android/app/src/main/AndroidManifest.xml) (widget `<receiver>`), [`app/build.gradle`](android/app/build.gradle) (Compose + Glance deps), and [`MainApplication.kt`](android/app/src/main/java/com/rafroutine/MainApplication.kt) (`add(RafRoutinePackage())`).

---

## Add the widget to your home screen

1. Build & launch the app once (so the widget gets registered).
2. **Long-press** an empty area of your home screen → **Widgets**.
3. Find **Raf Routine** → drag it onto the home screen (it's a large widget; resize as needed).
4. In the app, tap **Push to widget** to send the current routine. Tap it again any time after you change the data.

The widget also auto-refreshes about every 30 minutes (Android's minimum), and immediately whenever you push from the app.

---

## Editing the routine

For this first version the data is **local sample data** (no backend yet). To change it, edit [`src/data/sampleRoutine.ts`](src/data/sampleRoutine.ts) (and the matching fallback in [`RoutineParser.kt`](android/app/src/main/java/com/rafroutine/widget/model/RoutineParser.kt) if you want the widget's pre-push default to match), then **Reset to sample** + **Push to widget** in the app.

Each class needs `start` / `end` as `"HH:mm"` (24h). The NOW/NEXT/progress logic is derived from these times against the real clock — so to see a class show as **LIVE** during a demo, give one a time range that includes "right now".

---

## Project structure

```
RafRoutine/
├── App.tsx                         # companion screen: preview + push/reset
├── src/
│   ├── types/routine.ts            # the shared data contract (types)
│   ├── data/sampleRoutine.ts       # seed data
│   ├── services/routineEngine.ts   # live-state logic (NOW/NEXT/progress/labels)
│   ├── storage/routineStorage.ts   # AsyncStorage persistence
│   ├── native/WidgetBridge.ts      # typed wrapper over the native module
│   ├── theme/tokens.ts             # design tokens (colors/spacing)
│   └── components/                 # WidgetPreview, Pill, PrimaryButton
└── android/app/src/main/
    ├── java/com/rafroutine/
    │   ├── bridge/                 # RafRoutineModule (RN native module) + Package
    │   ├── data/RoutineRepository  # DataStore read/write
    │   └── widget/
    │       ├── RafRoutineWidget     # GlanceAppWidget (reads data → renders)
    │       ├── RafRoutineWidgetReceiver
    │       ├── model/               # RoutineModel, RoutineParser, LiveState
    │       ├── theme/WidgetTokens
    │       └── components/          # Header, NowCard, NextCard, TodayList, …
    └── res/                        # widget_background, bg_card, icons, provider xml
```

---

## Verifying the code

- **TypeScript:** `npm run tsc` (runs `tsc --noEmit`).
- **Kotlin:** builds as part of `npm run android`. If you change the Kotlin/Compose versions, keep `kotlinVersion` (in [`android/build.gradle`](android/build.gradle)) and `kotlinCompilerExtensionVersion` (in [`android/app/build.gradle`](android/app/build.gradle)) aligned — see the comments there.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `NativeModules.RafRoutineWidget` is `undefined` (push is a no-op) | The native module isn't built. Make sure `RafRoutinePackage()` is registered in `MainApplication.kt`, then rebuild with `npm run android`. |
| Compose compiler / Kotlin version error at build | Align `kotlinVersion` ↔ `kotlinCompilerExtensionVersion` (1.9.24 ↔ 1.5.14). If your baseline shipped a different Kotlin, change both together. |
| Widget not in the picker | Confirm the `<receiver>` + `@xml/raf_routine_widget_info` meta-data exist in `AndroidManifest.xml`, then reinstall the app. |
| Widget doesn't update after editing data | Tap **Push to widget** in the app; the home-screen widget refreshes immediately. |
| Build can't find `debug.keystore` / launcher icons | You skipped a copy step in **Setup** — copy them from the `react-native init` baseline. |

---

## Roadmap (not built yet)

- Full in-app routine editor (add/edit classes, notices, highlights)
- Sync from a backend (e.g. a REST API) instead of local sample data
- Sub-30-minute live ticking via `WorkManager`
- Multiple widget sizes / a compact layout

---

*Built as a clean, user-friendly starting point — the widget functions standalone with sample data, and the architecture is ready to grow.*
