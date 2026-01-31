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
    content: `All lawn care services must meet the following quality benchmarks:\n\n1. Mowing height must be consistent across the entire property, set to the client-specified height or our default of 3 inches.\n2. All edges along sidewalks, driveways, and garden beds must be crisp and clean with no visible overgrowth.\n3. Clippings must be evenly dispersed or bagged per client preference — no clumps left on the lawn.\n4. All debris (sticks, trash, leaves) must be cleared from the work area before departure.\n5. Walkways and driveways must be blown clean of all grass clippings and debris.\n6. Conduct a final walk-around inspection before leaving every property.`,
  },
  {
    id: '11',
    title: 'Safety First',
    category: 'Safety',
    content: `Safety is non-negotiable. Every team member must follow these rules at all times:\n\n1. Wear appropriate PPE: safety glasses, ear protection, steel-toe boots, and gloves when operating equipment.\n2. Never operate equipment you haven't been trained on.\n3. Inspect all equipment before each use — check blades, guards, fuel lines, and safety features.\n4. Maintain a 50-foot safety zone around active mowing equipment when bystanders are present.\n5. Report any equipment malfunction or safety hazard immediately to your crew lead.\n6. Never refuel hot engines. Allow a 5-minute cool-down period.\n7. In case of injury, administer first aid immediately and report to management within 15 minutes.`,
  },
  {
    id: '12',
    title: 'Professionalism Policy',
    category: 'Professionalism',
    content: `Our reputation is built on professionalism. Every interaction reflects on the company:\n\n1. Arrive at every job site on time. If delayed, notify the client and your crew lead immediately.\n2. Wear the company uniform (green polo, khaki pants/shorts) at all times on the job.\n3. Greet clients warmly and address them by name when possible.\n4. Keep all vehicles and equipment clean and organized.\n5. No smoking, loud music, or profanity on client properties.\n6. Take before and after photos of every job for our records.\n7. Leave a door hanger or text notification when the job is complete.`,
  },
];

export const initialGuides = [
  {
    id: '20',
    title: 'Mowing Procedures',
    category: 'Service Work',
    type: 'service',
    content: `Step-by-step mowing procedure:\n\n1. Walk the property first — identify and remove any obstacles, debris, or hazards.\n2. Set mower deck to the correct cutting height for the grass type and season.\n3. Begin mowing the perimeter of the lawn in a clockwise pattern.\n4. Switch to parallel striping rows for the interior, overlapping each pass by 2-3 inches.\n5. Alternate mowing direction each visit (north-south one week, east-west the next).\n6. Reduce speed on slopes and around obstacles.\n7. After mowing, inspect for missed spots and touch up as needed.\n8. Blow clippings off all hardscaped surfaces.`,
  },
  {
    id: '21',
    title: 'Edging & Trimming Guide',
    category: 'Service Work',
    type: 'service',
    content: `Proper edging and trimming technique:\n\n1. Edge all sidewalks, driveways, and curbs first using a stick edger.\n2. Maintain a consistent 90-degree cut angle along all hard edges.\n3. For garden beds, use a string trimmer held vertically for a clean line.\n4. Trim around all obstacles: trees, mailboxes, fence posts, utility boxes.\n5. Use a shield guard when trimming near vehicles, windows, or painted surfaces.\n6. Avoid trimming too close to tree trunks — maintain a 3-inch buffer to prevent bark damage.\n7. Sweep or blow all trimmings off walkways and beds when finished.`,
  },
  {
    id: '22',
    title: 'Property Cleanup Procedures',
    category: 'Service Work',
    type: 'service',
    content: `End-of-job cleanup checklist:\n\n1. Blow all grass clippings from driveways, sidewalks, patios, and porches.\n2. Remove any debris you generated during the service.\n3. Replace any displaced items (hoses, decorations, furniture) to their original positions.\n4. Check for and clean up any oil or fuel spills from equipment.\n5. Inspect the property from the street view — does it look clean and professional?\n6. Take an "after" photo from the same angle as your "before" photo.\n7. Lock gates if they were locked upon arrival.\n8. Note any property concerns (dead patches, pest damage, irrigation issues) in the job log.`,
  },
  {
    id: '23',
    title: 'Zero-Turn Mower Operation',
    category: 'Equipment & Maintenance',
    type: 'equipment',
    content: `Operating the zero-turn mower safely and effectively:\n\n1. Perform pre-operation check: tire pressure, oil level, blade condition, fuel level.\n2. Adjust the seat and mirrors before starting the engine.\n3. Start on a flat surface with the parking brake engaged.\n4. Release the parking brake and slowly push both levers forward to move straight.\n5. To turn: pull back on one lever while pushing the other forward.\n6. Practice on open ground before working near obstacles or slopes.\n7. Never operate on slopes greater than 15 degrees.\n8. Engage blades only when the mower is stationary and at full throttle.\n9. Disengage blades and reduce speed before turning at row ends.`,
  },
  {
    id: '24',
    title: 'Weekly Equipment Maintenance',
    category: 'Equipment & Maintenance',
    type: 'equipment',
    content: `Weekly maintenance schedule for all equipment:\n\nMonday:\n- Sharpen all mower blades\n- Check and replace trimmer line\n- Inspect edger blades for wear\n\nWednesday:\n- Check oil levels on all engines\n- Inspect air filters, clean or replace as needed\n- Grease all fittings and moving parts\n\nFriday:\n- Full equipment wash and cleaning\n- Inspect all safety guards and shields\n- Check fuel system for leaks\n- Test all safety switches and kill cords\n- Log any items needing repair or replacement`,
  },
  {
    id: '25',
    title: 'Trimmer Safety & Maintenance',
    category: 'Equipment & Maintenance',
    type: 'equipment',
    content: `String trimmer care and safety:\n\n1. Always wear safety glasses, ear protection, and long pants when operating.\n2. Check the trimmer head for cracks or damage before each use.\n3. Use the correct line diameter for your trimmer model (refer to equipment manual).\n4. Wind new line tightly and evenly to prevent tangling.\n5. Clean the air filter after every 10 hours of use.\n6. Replace spark plugs at the start of each season.\n7. Store trimmers hanging vertically to prevent fuel leaks.\n8. Never run the trimmer at full throttle when not cutting — it wastes fuel and wears the clutch.`,
  },
];

export const initialEquipment = [
  {
    id: '30',
    title: 'Commercial Zero-Turn Mower',
    category: 'Equipment Guide',
    content: `Model: GreenPro ZX-5400\n\nUsage:\n- Primary mowing equipment for properties over 5,000 sq ft\n- Cutting width: 54 inches\n- Top speed: 12 mph (reduce to 6 mph near obstacles)\n\nMaintenance:\n- Oil change every 50 hours of operation\n- Blade sharpening weekly or after 20 hours\n- Hydraulic fluid check monthly\n- Belt inspection every 100 hours\n- Annual dealer service recommended\n\nFuel: Regular unleaded gasoline (87 octane minimum)`,
  },
  {
    id: '31',
    title: 'Backpack Blower',
    category: 'Equipment Guide',
    content: `Model: AirForce BP-760\n\nUsage:\n- Cleanup of all hardscaped surfaces after service\n- Leaf removal during fall season\n- Max air speed: 210 mph\n- Use low setting near flower beds and mulch areas\n\nMaintenance:\n- Clean air filter every 5 hours of use\n- Check fuel lines weekly for cracks\n- Replace spark plug every season\n- Inspect throttle cable monthly\n- Store with empty fuel tank if not used for 30+ days`,
  },
  {
    id: '32',
    title: 'Commercial String Trimmer',
    category: 'Equipment Guide',
    content: `Model: TrimPro XT-2800\n\nUsage:\n- Edging, trimming around obstacles, and detail work\n- Shaft length: adjustable 60-72 inches\n- Use .095 round line for standard trimming\n- Use .105 square line for heavy growth\n\nMaintenance:\n- Line replacement as needed (carry spare spools)\n- Air filter cleaning every 10 hours\n- Gear head greasing every 25 hours\n- Inspect guard and shield before each use\n- Engine decarbon every 200 hours`,
  },
];

export const initialIdeas = [
  {
    id: '40',
    title: 'Holiday Lighting Services',
    category: 'Business Idea',
    content: `Expand into holiday lighting installation and removal:\n\nOpportunity:\n- Leverage existing client relationships during the off-season\n- Average installation job: $500-$2,000\n- Repeat business year after year\n\nImplementation:\n- Partner with a lighting supplier for wholesale pricing\n- Train 2-3 crew members in safe ladder and roof work\n- Offer packages: Basic (gutters only), Standard (gutters + bushes), Premium (full property)\n- Market to existing clients first via email and door hangers\n- Begin marketing in September for the holiday season`,
  },
  {
    id: '41',
    title: 'Subscription Fertilizer Program',
    category: 'Business Idea',
    content: `Launch a 5-step annual fertilizer and weed control program:\n\nOpportunity:\n- Recurring revenue with predictable scheduling\n- Higher margins than mowing services (60%+ gross margin)\n- Increases client retention and lifetime value\n\nImplementation:\n- Obtain required pesticide applicator licenses\n- Design a 5-application program: Early Spring, Late Spring, Summer, Fall, Winterizer\n- Price based on lawn square footage\n- Offer as add-on to existing mowing clients at a 15% discount\n- Track results with before/after photos to demonstrate value`,
  },
];

export const initialPolicies = [
  {
    id: '50',
    title: 'New Hire Onboarding Process',
    category: 'Hiring',
    content: `All new hires must complete the following before their first day in the field:\n\n1. Submit completed application, W-4, I-9, and direct deposit forms.\n2. Pass a background check and drug screening.\n3. Complete a 4-hour orientation covering company history, values, and expectations.\n4. Review and sign the employee handbook acknowledgment form.\n5. Complete equipment safety training (minimum 2 hours with a crew lead).\n6. Shadow an experienced crew for at least 3 full working days.\n7. Pass a practical skills assessment before operating any equipment independently.\n8. Receive company uniform, PPE kit, and employee ID badge.`,
  },
  {
    id: '51',
    title: 'Training Requirements',
    category: 'Training',
    content: `Ongoing training is mandatory for all field employees:\n\nMonthly:\n- One safety topic review (rotating schedule)\n- Equipment maintenance refresher\n\nQuarterly:\n- Customer service skills workshop\n- New technique or service demonstration\n\nAnnually:\n- Full safety certification renewal\n- Equipment operation re-certification\n- First aid and CPR certification\n- Pesticide safety training (if applicable)\n\nAll training attendance is tracked and required for continued employment.`,
  },
  {
    id: '52',
    title: 'Time Off Policy',
    category: 'Time Off',
    content: `Paid time off accrual and usage policy:\n\nAccrual Rates:\n- 0-1 years: 5 days PTO per year\n- 1-3 years: 10 days PTO per year\n- 3-5 years: 15 days PTO per year\n- 5+ years: 20 days PTO per year\n\nRules:\n- PTO requests must be submitted at least 2 weeks in advance.\n- No more than 2 crew members from the same team may be off simultaneously.\n- Peak season (April-October) PTO is limited and subject to approval.\n- Unused PTO carries over up to 5 days maximum.\n- Sick days: 3 paid sick days per year, no advance notice required.\n- Unpaid leave may be granted for special circumstances with manager approval.`,
  },
  {
    id: '53',
    title: 'Code of Conduct',
    category: 'Conduct',
    content: `All employees are expected to uphold the following standards of conduct:\n\n1. Treat all colleagues, clients, and vendors with respect and courtesy.\n2. Maintain honesty and integrity in all business dealings.\n3. Protect company property, equipment, and confidential information.\n4. Report any harassment, discrimination, or unsafe conditions immediately.\n5. No alcohol or drug use before or during work hours.\n6. Personal phone use is limited to break times only.\n7. Social media posts about the company must be approved by management.\n8. Conflicts of interest must be disclosed to management.\n\nViolations may result in disciplinary action up to and including termination.`,
  },
];
