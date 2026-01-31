let nextId = 100;
export const genId = () => String(nextId++);

export const initialAnnouncements = [
  {
    id: '1',
    title: 'Summer Schedule Update',
    message: 'Starting June 1st, we will shift to our summer operating hours. All crews should report by 6:30 AM. Hydration breaks are mandatory every 45 minutes during peak heat. Please review the updated route sheets posted in the break room.',
    priority: 'high',
    date: '2026-01-28',
    postedBy: 'Mike Johnson',
  },
  {
    id: '2',
    title: 'New Equipment Arriving Friday',
    message: 'We have two new zero-turn mowers and a commercial-grade edger arriving this Friday. Training sessions will be held Saturday morning. All crew leads are expected to attend and will then train their teams the following week.',
    priority: 'normal',
    date: '2026-01-25',
    postedBy: 'Sarah Williams',
  },
];

export const initialStandards = [
  {
    id: '10',
    title: 'Quality Standards',
    category: 'Quality',
    type: 'standard',
    content: `All lawn care services must meet the following quality benchmarks:\n\n1. Mowing height must be consistent across the entire property, set to the client-specified height or our default of 3 inches.\n2. All edges along sidewalks, driveways, and garden beds must be crisp and clean with no visible overgrowth.\n3. Clippings must be evenly dispersed or bagged per client preference — no clumps left on the lawn.\n4. All debris (sticks, trash, leaves) must be cleared from the work area before departure.\n5. Walkways and driveways must be blown clean of all grass clippings and debris.\n6. Conduct a final walk-around inspection before leaving every property.`,
  },
  {
    id: '11',
    title: 'Safety First',
    category: 'Safety',
    type: 'standard',
    content: `Safety is non-negotiable. Every team member must follow these rules at all times:\n\n1. Wear appropriate PPE: safety glasses, ear protection, steel-toe boots, and gloves when operating equipment.\n2. Never operate equipment you haven't been trained on.\n3. Inspect all equipment before each use — check blades, guards, fuel lines, and safety features.\n4. Maintain a 50-foot safety zone around active mowing equipment when bystanders are present.\n5. Report any equipment malfunction or safety hazard immediately to your crew lead.\n6. Never refuel hot engines. Allow a 5-minute cool-down period.\n7. In case of injury, administer first aid immediately and report to management within 15 minutes.`,
  },
  {
    id: '12',
    title: 'Professionalism Policy',
    category: 'Professionalism',
    type: 'policy',
    content: `Our reputation is built on professionalism. Every interaction reflects on the company:\n\n1. Arrive at every job site on time. If delayed, notify the client and your crew lead immediately.\n2. Wear the company uniform (green polo, khaki pants/shorts) at all times on the job.\n3. Greet clients warmly and address them by name when possible.\n4. Keep all vehicles and equipment clean and organized.\n5. No smoking, loud music, or profanity on client properties.\n6. Take before and after photos of every job for our records.\n7. Leave a door hanger or text notification when the job is complete.`,
  },
];

export const initialGuides = [
  {
    id: '20',
    title: 'Mowing Procedures',
    category: 'Service Work',
    type: 'service',
    content: '<h2>Step-by-step mowing procedure</h2><ol><li>Walk the property first — identify and remove any obstacles, debris, or hazards.</li><li>Set mower deck to the correct cutting height for the grass type and season.</li><li>Begin mowing the perimeter of the lawn in a clockwise pattern.</li><li>Switch to parallel striping rows for the interior, overlapping each pass by 2-3 inches.</li><li>Alternate mowing direction each visit (north-south one week, east-west the next).</li><li>Reduce speed on slopes and around obstacles.</li><li>After mowing, inspect for missed spots and touch up as needed.</li><li>Blow clippings off all hardscaped surfaces.</li></ol>',
  },
  {
    id: '21',
    title: 'Edging & Trimming Guide',
    category: 'Service Work',
    type: 'service',
    content: '<h2>Proper edging and trimming technique</h2><ol><li>Edge all sidewalks, driveways, and curbs first using a stick edger.</li><li>Maintain a consistent 90-degree cut angle along all hard edges.</li><li>For garden beds, use a string trimmer held vertically for a clean line.</li><li>Trim around all obstacles: trees, mailboxes, fence posts, utility boxes.</li><li>Use a shield guard when trimming near vehicles, windows, or painted surfaces.</li><li>Avoid trimming too close to tree trunks — maintain a 3-inch buffer to prevent bark damage.</li><li>Sweep or blow all trimmings off walkways and beds when finished.</li></ol>',
  },
  {
    id: '22',
    title: 'Property Cleanup Procedures',
    category: 'Service Work',
    type: 'service',
    content: '<h2>End-of-job cleanup checklist</h2><ol><li>Blow all grass clippings from driveways, sidewalks, patios, and porches.</li><li>Remove any debris you generated during the service.</li><li>Replace any displaced items (hoses, decorations, furniture) to their original positions.</li><li>Check for and clean up any oil or fuel spills from equipment.</li><li>Inspect the property from the street view — does it look clean and professional?</li><li>Take an "after" photo from the same angle as your "before" photo.</li><li>Lock gates if they were locked upon arrival.</li><li>Note any property concerns (dead patches, pest damage, irrigation issues) in the job log.</li></ol>',
  },
  {
    id: '23',
    title: 'Zero-Turn Mower Operation',
    category: 'Equipment & Maintenance',
    type: 'equipment',
    content: '<h2>Operating the zero-turn mower safely and effectively</h2><ol><li>Perform pre-operation check: tire pressure, oil level, blade condition, fuel level.</li><li>Adjust the seat and mirrors before starting the engine.</li><li>Start on a flat surface with the parking brake engaged.</li><li>Release the parking brake and slowly push both levers forward to move straight.</li><li>To turn: pull back on one lever while pushing the other forward.</li><li>Practice on open ground before working near obstacles or slopes.</li><li><strong>Never operate on slopes greater than 15 degrees.</strong></li><li>Engage blades only when the mower is stationary and at full throttle.</li><li>Disengage blades and reduce speed before turning at row ends.</li></ol>',
  },
  {
    id: '24',
    title: 'Weekly Equipment Maintenance',
    category: 'Equipment & Maintenance',
    type: 'equipment',
    content: '<h2>Weekly maintenance schedule</h2><h3>Monday</h3><ul><li>Sharpen all mower blades</li><li>Check and replace trimmer line</li><li>Inspect edger blades for wear</li></ul><h3>Wednesday</h3><ul><li>Check oil levels on all engines</li><li>Inspect air filters, clean or replace as needed</li><li>Grease all fittings and moving parts</li></ul><h3>Friday</h3><ul><li>Full equipment wash and cleaning</li><li>Inspect all safety guards and shields</li><li>Check fuel system for leaks</li><li>Test all safety switches and kill cords</li><li>Log any items needing repair or replacement</li></ul>',
  },
  {
    id: '25',
    title: 'Trimmer Safety & Maintenance',
    category: 'Equipment & Maintenance',
    type: 'equipment',
    content: '<h2>String trimmer care and safety</h2><ol><li>Always wear safety glasses, ear protection, and long pants when operating.</li><li>Check the trimmer head for cracks or damage before each use.</li><li>Use the correct line diameter for your trimmer model (refer to equipment manual).</li><li>Wind new line tightly and evenly to prevent tangling.</li><li>Clean the air filter after every 10 hours of use.</li><li>Replace spark plugs at the start of each season.</li><li>Store trimmers hanging vertically to prevent fuel leaks.</li><li><strong>Never</strong> run the trimmer at full throttle when not cutting — it wastes fuel and wears the clutch.</li></ol>',
  },
];

export const initialEquipment = [
  {
    id: '30',
    name: 'Toro Zero-Turn Mower #1',
    status: 'operational',
    lastMaintenance: '1/19/2026',
    nextMaintenance: '2/19/2026',
  },
  {
    id: '31',
    name: 'Echo String Trimmer',
    status: 'needs-repair',
    lastMaintenance: '1/9/2026',
    reportedIssue: 'Engine starts but dies after 30 seconds',
    reportedBy: 'Mike',
    reportedDate: '1/26/2026',
  },
  {
    id: '32',
    name: 'Honda Walk-Behind Mower',
    status: 'operational',
    lastMaintenance: '1/17/2026',
    nextMaintenance: '2/17/2026',
  },
];

export const initialIdeas = [
  {
    id: '40',
    title: 'Add mulch bed service',
    description: 'Several customers asked about mulch installation. Could be good upsell in spring.',
    submittedBy: 'Sarah',
    date: '1/24/2026',
    status: 'Reviewing',
  },
  {
    id: '41',
    title: 'Get a backup trimmer',
    description: 'When equipment breaks, we lose time. Having backup would keep us running.',
    submittedBy: 'Mike',
    date: '1/19/2026',
    status: 'Implemented',
  },
];

export const initialPolicies = [
  {
    id: '50',
    title: 'Pay & Benefits',
    category: 'Compensation',
    summary: 'Pay schedule, overtime, mileage reimbursement policies.',
    content: `Pay & Benefits Policy:\n\nPay Schedule:\n- Paid every Friday via direct deposit.\n- Pay period runs Monday through Sunday.\n\nOvertime:\n- Overtime applies after 40 hours per week.\n- Overtime rate is 1.5x regular hourly rate.\n- All overtime must be pre-approved by your crew lead.\n\nMileage Reimbursement:\n- Reimbursed at the current IRS rate for approved travel.\n- Log all mileage in the daily timesheet.\n- Travel between job sites during the workday is reimbursable.\n- Commute to and from the shop is not reimbursable.`,
  },
  {
    id: '51',
    title: 'Time Off & Scheduling',
    category: 'Time Off',
    summary: 'Vacation, sick time, holidays, and 2-week notice requirements.',
    content: `Paid time off accrual and usage policy:\n\nAccrual Rates:\n- 0-1 years: 5 days PTO per year\n- 1-3 years: 10 days PTO per year\n- 3-5 years: 15 days PTO per year\n- 5+ years: 20 days PTO per year\n\nRules:\n- PTO requests must be submitted at least 2 weeks in advance.\n- No more than 2 crew members from the same team may be off simultaneously.\n- Peak season (April-October) PTO is limited and subject to approval.\n- Unused PTO carries over up to 5 days maximum.\n- Sick days: 3 paid sick days per year, no advance notice required.\n- Unpaid leave may be granted for special circumstances with manager approval.`,
  },
  {
    id: '52',
    title: 'New Hire Onboarding',
    category: 'Onboarding',
    summary: 'Orientation, training, and first-week requirements for new employees.',
    content: `All new hires must complete the following before their first day in the field:\n\n1. Submit completed application, W-4, I-9, and direct deposit forms.\n2. Pass a background check and drug screening.\n3. Complete a 4-hour orientation covering company history, values, and expectations.\n4. Review and sign the employee handbook acknowledgment form.\n5. Complete equipment safety training (minimum 2 hours with a crew lead).\n6. Shadow an experienced crew for at least 3 full working days.\n7. Pass a practical skills assessment before operating any equipment independently.\n8. Receive company uniform, PPE kit, and employee ID badge.`,
  },
  {
    id: '53',
    title: 'Code of Conduct',
    category: 'Conduct',
    summary: 'Workplace behavior expectations and disciplinary guidelines.',
    content: `All employees are expected to uphold the following standards of conduct:\n\n1. Treat all colleagues, clients, and vendors with respect and courtesy.\n2. Maintain honesty and integrity in all business dealings.\n3. Protect company property, equipment, and confidential information.\n4. Report any harassment, discrimination, or unsafe conditions immediately.\n5. No alcohol or drug use before or during work hours.\n6. Personal phone use is limited to break times only.\n7. Social media posts about the company must be approved by management.\n8. Conflicts of interest must be disclosed to management.\n\nViolations may result in disciplinary action up to and including termination.`,
  },
];

export const initialTimeOffRequests = [
  {
    id: 'pto1',
    name: 'Sarah',
    startDate: '2/14/2026',
    endDate: '2/16/2026',
    days: 3,
    reason: 'Family vacation',
    requestedDate: '1/24/2026',
    status: 'pending',
  },
  {
    id: 'pto2',
    name: 'Mike',
    startDate: '3/9/2026',
    endDate: '3/9/2026',
    days: 1,
    reason: 'Doctor appointment',
    requestedDate: '1/19/2026',
    status: 'approved',
  },
];

export const initialOwnerStartChecklist = [
  { id: 'sd-h1', text: 'Communicate', type: 'header', indent: 0, done: false },
  { id: 'sd-1', text: 'Open [Gmail](https://mail.google.com/mail/u/0/#inbox) and [GHL Conversations](https://app.gohighlevel.com/v2/location/Umlo2UnfqbijiGqNU6g2/conversations/conversations)', type: 'item', indent: 0, done: false },
  { id: 'sd-1a', text: 'Reply to messages in GHL', type: 'item', indent: 1, done: false },
  { id: 'sd-1b', text: 'Reply to messages in Gmail', type: 'item', indent: 1, done: false },
  { id: 'sd-2', text: 'Review [Jobber Home](https://secure.getjobber.com/schedule/month/2026/1/17?unscheduled=off&map=hidden&nav_label=Schedule&nav_source=sidebar&displayMode=full&assignees=MjM3NjQwMw%3D%3D) and update accordingly', type: 'item', indent: 0, done: false },
  { id: 'sd-3', text: 'Open [Sales Pipeline](https://app.gohighlevel.com/v2/location/Umlo2UnfqbijiGqNU6g2/opportunities/list) and follow up', type: 'item', indent: 0, done: false },
];

export const initialOwnerEndChecklist = [
  { id: 'ed-h1', text: 'Communicate', type: 'header', indent: 0, done: false },
  { id: 'ed-1', text: 'Open [Gmail](https://mail.google.com/mail/u/0/#inbox) and [GHL Conversations](https://app.gohighlevel.com/v2/location/Umlo2UnfqbijiGqNU6g2/conversations/conversations)', type: 'item', indent: 0, done: false },
  { id: 'ed-1a', text: 'Reply to messages in GHL', type: 'item', indent: 1, done: false },
  { id: 'ed-1b', text: 'Reply to messages in Gmail', type: 'item', indent: 1, done: false },
  { id: 'ed-2', text: 'Review [Jobber Home](https://secure.getjobber.com/schedule/month/2026/1/17?unscheduled=off&map=hidden&nav_label=Schedule&nav_source=sidebar&displayMode=full&assignees=MjM3NjQwMw%3D%3D) and update accordingly', type: 'item', indent: 0, done: false },
  { id: 'ed-3', text: 'Open [Sales Pipeline](https://app.gohighlevel.com/v2/location/Umlo2UnfqbijiGqNU6g2/opportunities/list) and follow up', type: 'item', indent: 0, done: false },
  { id: 'ed-h2', text: 'Invoices, Payments, Mileage, Expenses', type: 'header', indent: 0, done: false },
  { id: 'ed-4', text: '[Send invoices](https://secure.getjobber.com/schedule/month/2026/1/25?unscheduled=off&map=hidden&nav_label=Schedule&nav_source=sidebar&displayMode=full&assignees=unassigned&assignees=MzY1MTY5MA%3D%3D&appointmentTypes=Visit)', type: 'item', indent: 0, done: false },
  { id: 'ed-5', text: '[Track mileage](https://qbo.intuit.com/app/mileage?jobId=expenses)', type: 'item', indent: 0, done: false },
  { id: 'ed-6', text: 'Review [Account](https://qbo.intuit.com/app/banking?jobId=accounting) \u2014 All dates > This Year > Apply', type: 'item', indent: 0, done: false },
  { id: 'ed-h3', text: 'Highlevel', type: 'header', indent: 0, done: false },
  { id: 'ed-7', text: '[Check pipeline](https://app.gohighlevel.com/v2/location/Umlo2UnfqbijiGqNU6g2/opportunities/list) \u2014 Ensure everyone who needs to be scheduled is scheduled and won/lost', type: 'item', indent: 0, done: false },
  { id: 'ed-h4', text: 'Route & Tomorrow Prep', type: 'header', indent: 0, done: false },
  { id: 'ed-8', text: 'Ensure [route](https://secure.getjobber.com/schedule/month/2026/1/1?map=small&displayMode=half-collapsed&unscheduled=on) is right and assigned to right people', type: 'item', indent: 0, done: false },
  { id: 'ed-9', text: 'Do I need to buy or load anything?', type: 'item', indent: 0, done: false },
  { id: 'ed-10', text: 'Is everyone healthy and ready to work?', type: 'item', indent: 0, done: false },
  { id: 'ed-11', text: 'Any weather issues (rain, temp, wind)?', type: 'item', indent: 0, done: false },
  { id: 'ed-h5', text: 'Communication & Double-Check', type: 'header', indent: 0, done: false },
  { id: 'ed-12', text: 'Check GHL email/text and Gmail \u2014 filter for unread!', type: 'item', indent: 0, done: false },
  { id: 'ed-13', text: "[Check opportunities](https://app.gohighlevel.com/v2/location/Umlo2UnfqbijiGqNU6g2/opportunities/list) and nudge anyone who hasn't replied", type: 'item', indent: 0, done: false },
  { id: 'ed-14', text: 'Check off evening checklist on Jobber', type: 'item', indent: 0, done: false },
  { id: 'ed-15', text: "Review tomorrow's list on mobile Jobber for all members", type: 'item', indent: 0, done: false },
  { id: 'ed-16', text: 'Write my top 3 for tomorrow', type: 'item', indent: 0, done: false },
];
