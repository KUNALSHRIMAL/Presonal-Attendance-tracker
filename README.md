# AttendTrack

AttendTrack is a personal attendance and salary tracker that runs directly in the browser. There is no backend, account, build step, or package install.

## Features

### Attendance Logging

- Select any month and year to view or edit attendance.
- Add entries with date, check-in time, check-out time, and an optional note.
- Edit time and note fields inline from the table.
- Quick-fill a day with default hours: `09:30` to `18:30`.
- Default working day is 9 hours.
- Mobile view switches from a table to day cards for easier tapping.

### Leave, Holidays, and Off Days

- Sundays are automatically treated as weekly off days.
- Holidays can be added with a custom name and are counted as paid days.
- Paid Leave (PL) can be marked on working days.
- PL is limited to 1 day per month.
- PL credits 685 minutes, equal to 11 hours 25 minutes.

### Salary Calculator

- Save monthly salary in browser `localStorage`.
- Salary is calculated by minutes worked, not only by full days.
- Sundays and holidays are credited as full paid days.
- PL and unused PL are credited according to the app rules.
- Late arrivals or early exits reduce earned pay through short-time deduction.
- The deduction card shows the actual difference between monthly salary and earned pay.

### Payslip Generator

- Click `Download Pay Slip` to enter employee details.
- Employee details are saved in `localStorage` for the next payslip.
- Payable days are auto-filled from the selected month.
- Gross earnings, gross deductions, net pay, and net pay in words are generated automatically.
- The payslip uses the included `logo.png` and is formatted to match the reference salary slip.
- The browser print dialog opens so the payslip can be saved as PDF.

Note: Chrome and Edge print headers/footers are controlled by the browser. If they appear in the PDF preview, turn off `Headers and footers` in the print dialog.

### CSV Backup

- Export the selected month as a CSV file.
- Import a previously exported CSV file to restore attendance, notes, PL, and holidays.

## Getting Started

1. Download or clone this repository.
2. Open `index.html` in a browser.
3. Start tracking attendance.

No `npm install`, no server, and no build step are required.

## File Structure

```text
index.html        App markup
styles.css        App styling
app.js            App logic, salary logic, CSV import/export, payslip generator
logo.png          Payslip logo
README.md         Project documentation
```

## Salary Calculation Logic

```text
Per Day Rate    = Monthly Salary / Days in selected month
Per Minute Rate = Per Day Rate / 540

Earned Pay =
  Sunday full-day credit
  + holiday full-day credit
  + worked minutes * per-minute rate
  + PL minutes * per-minute rate
  + unused PL minutes * per-minute rate

Deduction = Monthly Salary - Earned Pay
Net Pay   = Earned Pay
```

Example for June 2026:

```text
Monthly salary: 22500
Earned pay:     20739
Deduction:      1761
```

## Data Storage

All data is stored locally in the browser using `localStorage`:

- Attendance entries
- Holidays
- Monthly salary
- Theme preference
- Payslip employee details

Because the data is local to the browser, export CSV backups regularly.

## Browser Support

AttendTrack is designed for modern browsers:

- Chrome
- Edge
- Firefox
- Safari

## License

Personal use. Free to modify and adapt for your own workflow.
