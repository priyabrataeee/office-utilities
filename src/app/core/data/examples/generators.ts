import type { ToolExample } from '../tool-examples';

export const GENERATOR_EXAMPLES: Record<string, ToolExample> = {
  'invoice-generator': {
    title: 'Bill a client for two pieces of work',
    steps: ['In Invoice details, enter INV-0107 and the dates. In Client, enter Jordan Reyes as the fictional client.', 'In Line items, keep two items: Website maintenance, Qty 10, Rate 60, and Hosting setup, Qty 1, Rate 400. Remove the third sample item.', 'In Totals, choose GBP £, set Tax label to VAT and Tax rate (%) to 20, then check the preview and choose Download PDF.'],
    check: 'The preview should show Subtotal £1,000.00, VAT (20%) £200.00 and Total £1,200.00. One tax rate is applied to the whole invoice after any discount; tax rules, rates and required invoice details vary by country, so check them yourself. Invoice numbers are not tracked between invoices.',
  },
  'resume-builder': {
    title: 'Fit two roles onto one CV',
    steps: ['In Contact, replace the sample with Jordan Reyes, a fictional headline and an example email address.', 'In Experience, edit both roles and put each highlight on its own line in Highlights (one per line).', 'Add three skills in Skills & projects, then choose Download DOCX if you want to keep editing in Word.'],
    check: 'Check that every highlight appears as its own bullet and that periods line up on the right. There is one fixed layout, no photo field and no check against applicant tracking systems. Read the exported file once more before sending it.',
  },
  'quotation-generator': {
    title: 'Quote a workshop with a percentage discount',
    steps: ['In Quote details, enter QUO-0042, a date and a Valid until date. In Prospect, enter Northwind Studio as the fictional client.', 'In Line items, enter Training day, Qty 3, Rate 800, and Written report, Qty 1, Rate 600. Remove the third sample item.', 'In Totals, choose Percentage as the Discount type and enter 10, then list exclusions in What is not included.'],
    check: 'The preview should show Subtotal 3,000.00, Discount − 300.00 and Total 2,700.00. A tax line only appears when Tax rate (%) is above zero. The Accepted by signature lines appear only when Terms and conditions has text; the quote is not sent or tracked for you.',
  },
  'meeting-minutes-generator': {
    title: 'Record one decision and two actions',
    steps: ['In Meeting, enter a title, date and time, with Jordan Reyes as Chaired by.', 'In Agenda & discussion, add one item with a short Discussion and a one-line Decision.', 'In Actions, add two action items with an Owner and a Due value each, then download the minutes.'],
    check: 'Check that the decision appears under its numbered topic and each action has an owner. Due is plain text, so dates are not checked or turned into reminders. The minutes are a record you write; nobody is notified.',
  },
  'business-proposal-generator': {
    title: 'Price a two-phase proposal',
    steps: ['In Cover, enter a Proposal title, Northwind Studio as Prepared by and a fictional client as Prepared for.', 'In Scope, add two phases to Timeline with a Duration and Outcome each.', 'In Investment, enter Phase 1, Qty 1, Rate 4000, and Phase 2, Qty 1, Rate 11000. Remove the third sample line.'],
    check: 'The Investment section should total 15,000.00 with no tax. The cover sits on its own page and empty sections are left out. The tool lays out what you write; it does not check prices, dates or contract terms.',
  },
  'salary-slip-generator': {
    title: 'Prepare one monthly payslip',
    steps: ['In Employee, enter Jordan Reyes and a fictional Employee ID. In Pay period, enter March 2026 and £ as the Currency symbol.', 'Leave two rows in Earnings: Basic salary 2500 and Transport allowance 300. Leave two in Deductions: Income tax 420 and Pension 140.', 'Tick Show net pay in words in Footer, then compare the totals in the preview.'],
    check: 'Gross earnings should be £2,800.00, Total deductions £560.00 and Net pay £2,240.00, in words Two thousand two hundred and forty only. With 22 Working days, entering 2 Loss-of-pay days adds a Loss of pay (2 days) deduction of £254.55 and shows Days paid as 20 of 22. Tax and other deductions are not calculated for you. The payslip is a template the issuer must check against local law and their own payroll records.',
  },
  'offer-letter-generator': {
    title: 'Draft a full-time offer',
    steps: ['In Candidate, enter Jordan Reyes and an address. In The role, choose Full-time and enter a Job title and Start date.', 'In Terms, enter the salary, choose Per year as the Salary period and fill in Probation period and Notice period.', 'Add two benefits, set Accept by, then read the whole letter in the preview.'],
    check: 'Check the salary, dates and probation wording in the finished sentences. The letter states the salary with the period you chose and adds that it is subject to the usual statutory deductions; it does not say how often pay is made, so add that in the DOCX if needed. It is a template the issuer is responsible for checking against local law and their own policies.',
  },
  'experience-letter-generator': {
    title: 'Confirm dates of employment',
    steps: ['In Letter type, choose Experience certificate and add a Reference.', 'In Employee, enter Jordan Reyes, a Last designation, the From and To dates and the Pronoun.', 'Add two responsibilities in Content, then check the pronouns in each sentence of the preview.'],
    check: 'Check that the dates and job title match your records. Choosing Relieving letter adds a sentence saying all company property has been returned, so use it only when that is true. The letter is a template the issuer must check against local law and their own records.',
  },
  'cover-letter-generator': {
    title: 'Write a letter with three evidence paragraphs',
    steps: ['In You, enter Jordan Reyes and contact details. In Recipient, enter Northwind Studio and the Role applied for.', 'In Letter, write three lines in Evidence paragraphs (one per line), one for each requirement in the advert.', 'Check the salutation and Re: line in the preview, then download the letter.'],
    check: 'Each line becomes its own paragraph. If Hiring manager is empty or says Hiring Manager, the letter opens with Dear Hiring Manager. The tool does not write or check the content for you.',
  },
  'qr-code-generator': {
    title: 'Make a guest Wi-Fi code',
    steps: ['Choose Wi-Fi network and enter Northwind Guest as the Network name (SSID).', 'Choose WPA / WPA2 / WPA3 as the Security and enter a test password.', 'Leave the Quiet border at 4 modules, then open What is actually encoded and download the PNG or SVG.'],
    check: 'Scan the code with a phone before printing it. The password is stored in the code in plain text. Codes are static: there is no scan tracking, no editable link after printing and no logo overlay.',
  },
};
