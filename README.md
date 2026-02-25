# 📋 AttendTrack

A personal attendance tracker built as a **single HTML file** — no server, no dependencies, no install. Just open it in any browser and start tracking.

![Dark UI](https://img.shields.io/badge/UI-Dark%20Mode-1a2030?style=flat-square)
![Mobile](https://img.shields.io/badge/Responsive-Mobile%20Ready-10d98a?style=flat-square)
![Size](https://img.shields.io/badge/Size-Single%20File-f5c842?style=flat-square)
![Storage](https://img.shields.io/badge/Storage-LocalStorage-9d7ff5?style=flat-square)

---

## ✨ Features

### 🗓 Attendance Logging
- Select any **month & year** to view or edit that month's log
- **Quick Add form** at the top — enter date, check-in, check-out, and a note
- **Inline editing** — click directly on any time or note cell in the table to edit it
- **Quick fill button (`+`)** on each row auto-fills default hours (9:30 → 18:30)
- Default working hours: **9:30 AM to 6:30 PM (9 hours/day)**

### ☀️ Leave & Off Days
- **Sundays** are automatically marked as weekly off — no attendance needed
- **Holidays** can be added with a custom name and date — counted as paid days
- **Paid Leave (PL)** — mark any working day as paid leave
  - Only **1.25 days (1 PL day)** allowed per month
  - PL adds **11 hours 25 minutes (685 minutes)** to your total worked hours
  - Once the monthly limit is reached, all other PL buttons are disabled

### 💰 Salary Calculator
- Enter your **monthly salary (₹)** once — it's saved for future sessions
- Salary is calculated **per minute**, not per day
- Formula: `Monthly Salary ÷ (Total Days × 540 mins) = Rate per minute`
- Shows live:
  - **Per Day Rate**
  - **Earned So Far** (based on actual minutes worked + Sundays + holidays + PL)
  - **Deduction** (absent days only)
  - **Net Payable**
- Sundays and holidays are always **fully paid**
- Only **absent working days** cause deductions

### 📊 Stats Dashboard
| Card | Description |
|------|-------------|
| 🟢 Present | Days you logged attendance |
| 🔴 Absent | Working days with no entry (up to today) |
| 🟡 Holidays | Custom holidays added for the month |
| 🟣 Sundays | Weekly off days |
| 🩷 PL | Paid leave days used (max 1) |
| 🔵 Total Hrs | Total hours including PL |

### 💾 Data & Backup
- All data saved automatically in **browser localStorage** — no account needed
- **Export CSV** — download a full month's attendance as a `.csv` file
- **Import CSV** — recover your data from a previously exported file
  - Smart parser handles check-in/out times, paid leave, notes, and holidays

---

## 🚀 Getting Started

1. **Download** `attendance-tracker.html`
2. **Open** it in any browser (Chrome, Firefox, Safari, Edge)
3. That's it — no install, no setup

```
No npm install. No build step. No backend. Just open the file.
```

---

## 📱 Mobile Support

The app is fully responsive:

| Screen Size | Layout |
|-------------|--------|
| Desktop (> 720px) | Full table view with inline editable cells |
| Tablet (720px–1100px) | Compact 2-column grid, scrollable table |
| Mobile (< 720px) | Day cards layout — one card per day, large tap targets |
| Small phones (< 480px) | Single-column stacked layout |

---

## 🗂 File Structure

```
attendance-tracker.html   ← The entire app (HTML + CSS + JS, single file)
README.md
```

---

## 🧮 Salary Calculation Logic

```
Per Minute Rate  = Monthly Salary ÷ (Days in Month × 540)

Earned So Far    = (Worked Minutes + Sunday Minutes + Holiday Minutes + PL Minutes)
                   × Per Minute Rate

Deduction        = Absent Days × 540 × Per Minute Rate

Net Payable      = Earned So Far
```

> **Example:** ₹30,000 salary, 30-day month → ₹30,000 ÷ 16,200 mins = ₹1.85/min
> Work 8h 45m one day → earn ₹30,000 × (525 ÷ 16,200) = ₹972 for that day

---

## 💡 Tips

- **Edit any past date** — click the time cell in any row, any month
- **Sunday attendance blocked** by default, but you can still fill time if needed (no restrictions mode)
- **Holidays are global** — if you add a holiday, it shows on every month view
- **PL is per month** — each month has its own 1.25 day PL allowance
- **Import CSV to recover data** — always export at month end as a backup

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, CSS Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES2020) |
| Storage | Browser `localStorage` |
| Fonts | Inter + JetBrains Mono (Google Fonts) |
| Dependencies | **None** |

---

## 📸 UI Overview

```
┌─────────────────────────────────────────────────────┐
│  📋 AttendTrack          Wed Feb 25 2026             │
├──────────────┬──────────────┬───────────────────────┤
│  Month/      │  Holidays    │  💰 Salary Calculator  │
│  Quick Add   │  Manager     │  ₹ Per Day / Earned   │
├──────┬───────┴──────┬───────┴───────┬───────┬───────┤
│  ✓   │  ✗ Absent   │  🎉 Holidays  │  ☀ Sun│  🔵Hrs │
│  12  │     2        │      1        │   4   │ 108h  │
├──────┴─────────────────────────────────────────────-┤
│  Date    Day   Status   In      Out    Hours  OT/PL  │
│  ...01   Mon   ✓ Present 09:30  18:30  9h     ✓     │
│  ...02   Tue   ✗ Absent  —      —      —      —     │
│  ...03   Wed   🌴 PL     —      —      11h25  🌴 ON │
└─────────────────────────────────────────────────────┘
```

---

## 📄 License

Personal use. Free to modify and adapt for your own needs.

---

Made with ☕ as a zero-dependency personal productivity tool.
