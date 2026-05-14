import { QuestionType } from "@prisma/client";

export interface ListeningData {
  title: string;
  audioUrl: string;
  transcript: string;
  timeLimit: number;
  questions: {
    type: QuestionType;
    prompt: string;
    options?: string[];
    correctAnswer: string;
  }[];
}

// audioUrl is empty for TTS-generated listening: the client will use Web Speech
// (SpeechSynthesis) to read the `transcript` field aloud at runtime.

export const LISTENING_TESTS: ListeningData[] = [
  {
    title: "Section 1 — Booking a Hotel",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Receptionist: Good morning, Riverside Hotel. How can I help you?
Caller: Hi, I'd like to book a room for next weekend, please.
Receptionist: Certainly. May I take your name?
Caller: Yes, it's Sarah Mitchell. That's M-I-T-C-H-E-L-L.
Receptionist: Thank you, Sarah. And which dates exactly?
Caller: Friday the 15th of March, for three nights.
Receptionist: Right, so checking out on Monday the 18th. Would you like a single, double, or family room?
Caller: A double, please. Is breakfast included?
Receptionist: Yes, breakfast is included. The rate is one hundred and twenty pounds per night.
Caller: That's fine. Can I pay by card on arrival?
Receptionist: Of course. Could I take a phone number for the booking?
Caller: It's 07 700 900 123.
Receptionist: Perfect. Your booking reference is RH-2841. We'll see you on the 15th.`,
    questions: [
      { type: QuestionType.FILL_BLANK, prompt: "Caller's surname: ___", correctAnswer: "Mitchell" },
      { type: QuestionType.FILL_BLANK, prompt: "Check-in date: ___ March", correctAnswer: "15" },
      { type: QuestionType.MCQ, prompt: "How many nights is the booking?", options: ["2", "3", "4", "5"], correctAnswer: "3" },
      { type: QuestionType.MCQ, prompt: "Type of room booked:", options: ["Single", "Double", "Family", "Suite"], correctAnswer: "Double" },
      { type: QuestionType.FILL_BLANK, prompt: "Price per night: ___ pounds", correctAnswer: "120" },
      { type: QuestionType.FILL_BLANK, prompt: "Booking reference: RH-___", correctAnswer: "2841" },
    ],
  },
  {
    title: "Section 1 — Library Membership",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Librarian: Good afternoon, how can I help you?
Visitor: Hi, I'd like to register for a library card, please.
Librarian: Of course. Are you a resident in this borough?
Visitor: Yes, I moved here two months ago.
Librarian: Lovely. May I have your full name?
Visitor: David Chen. C-H-E-N.
Librarian: Thank you. And your home address?
Visitor: Forty-seven, Oak Avenue, postcode SW 12 4 RP.
Librarian: Date of birth?
Visitor: The third of August, 1996.
Librarian: Right. Membership is free. Standard cards allow eight books at a time, and you can borrow them for three weeks. There's a small fee for DVDs — fifty pence each.
Visitor: That's great. Do you offer any quiet study rooms?
Librarian: Yes, on the second floor. They can be booked online for up to two hours.`,
    questions: [
      { type: QuestionType.FILL_BLANK, prompt: "Visitor's surname: ___", correctAnswer: "Chen" },
      { type: QuestionType.FILL_BLANK, prompt: "House number: ___", correctAnswer: "47" },
      { type: QuestionType.FILL_BLANK, prompt: "Postcode: SW ___ RP", correctAnswer: "12 4" },
      { type: QuestionType.MCQ, prompt: "Maximum books to borrow at one time:", options: ["5", "6", "8", "10"], correctAnswer: "8" },
      { type: QuestionType.MCQ, prompt: "DVD fee:", options: ["20p", "50p", "1 pound", "Free"], correctAnswer: "50p" },
      { type: QuestionType.MCQ, prompt: "Study rooms can be booked for up to:", options: ["1 hour", "2 hours", "3 hours", "All day"], correctAnswer: "2 hours" },
    ],
  },
  {
    title: "Section 2 — Museum Tour Information",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Welcome everyone to the National Heritage Museum. My name's Olivia, and I'll be your guide today. Before we start, a few quick notes on what to expect.

Our museum is divided into four main sections. The ground floor focuses on prehistory, with our famous fossil collection — that's straight ahead through the central archway. The first floor covers the medieval period, from about the year 800 to 1500. On the second floor you'll find our industrial revolution gallery, which many visitors find the most interesting. Finally, the top floor houses temporary exhibitions, which currently focus on modern photography.

Our tour today will last roughly ninety minutes. Photography is allowed throughout, but please switch off your flash, as it can damage some of the older paintings. The cloakroom is just behind reception, on the right, and is free to use. Large bags must be left there.

Coffee and snacks are available in our café on the ground floor — that closes at five p.m. The gift shop is open until six.

If you get separated from the group, please make your way to the main entrance and a staff member will help reunite you with us.`,
    questions: [
      { type: QuestionType.FILL_BLANK, prompt: "Guide's name: ___", correctAnswer: "Olivia" },
      { type: QuestionType.MCQ, prompt: "Tour duration:", options: ["60 minutes", "90 minutes", "120 minutes", "All day"], correctAnswer: "90 minutes" },
      { type: QuestionType.MCQ, prompt: "Photography is allowed but visitors must not use:", options: ["Tripods", "Phones", "Flash", "Selfie sticks"], correctAnswer: "Flash" },
      { type: QuestionType.FILL_BLANK, prompt: "Number of main sections in the museum: ___", correctAnswer: "4" },
      { type: QuestionType.MCQ, prompt: "Current temporary exhibition is about:", options: ["Modern art", "Modern photography", "Ancient ceramics", "Roman coins"], correctAnswer: "Modern photography" },
      { type: QuestionType.MCQ, prompt: "Café closes at:", options: ["4 p.m.", "5 p.m.", "6 p.m.", "7 p.m."], correctAnswer: "5 p.m." },
    ],
  },
  {
    title: "Section 2 — Community Garden Project",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Good evening, everyone, and thanks for coming to this meeting about the Riverside Community Garden Project. My name is Mark Patel, and I'm the project coordinator.

Let me give you a quick overview. The land was donated by the council last spring, and our first task was to clear the rubbish — there were over six tonnes removed in the first weekend alone. Since then, volunteers have built four large raised beds, a small greenhouse, and a wooden shed for tools.

Going forward, we plan to add a children's play area, a wildflower meadow to attract pollinators, and a pond, although the pond will be fenced for safety. We hope to have these finished by next summer.

Membership currently costs eighteen pounds a year, which gives you access to the shared plot, free seeds, and our monthly workshops. Workshops cover topics from composting to beekeeping; the most popular so far has been tomato growing.

We're always looking for volunteers, especially on Saturday mornings. No experience is needed — just turn up at nine a.m. Sign-up sheets are at the back, and our newsletter goes out on the first Tuesday of every month.`,
    questions: [
      { type: QuestionType.FILL_BLANK, prompt: "Coordinator's surname: ___", correctAnswer: "Patel" },
      { type: QuestionType.FILL_BLANK, prompt: "Tonnes of rubbish cleared: ___", correctAnswer: "6" },
      { type: QuestionType.MCQ, prompt: "What feature will be fenced for safety?", options: ["Greenhouse", "Pond", "Shed", "Meadow"], correctAnswer: "Pond" },
      { type: QuestionType.FILL_BLANK, prompt: "Annual membership cost: ___ pounds", correctAnswer: "18" },
      { type: QuestionType.MCQ, prompt: "Most popular workshop topic so far:", options: ["Composting", "Beekeeping", "Tomato growing", "Pruning"], correctAnswer: "Tomato growing" },
      { type: QuestionType.MCQ, prompt: "Newsletter is sent out:", options: ["Every Saturday", "First Tuesday of the month", "End of every month", "Twice a year"], correctAnswer: "First Tuesday of the month" },
    ],
  },
  {
    title: "Section 3 — Student Discussion: Project Plan",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Tutor: So, Anna and James, where are you with the climate communication project?
Anna: Hi Dr Reed. We've finished the literature review and started designing the survey.
James: Yes, we're focusing on how different age groups respond to climate messaging.
Tutor: Good. How many participants are you aiming for?
James: We were thinking about two hundred, but our supervisor said one hundred and fifty should be enough.
Anna: Right, one fifty, split evenly between three age brackets.
Tutor: Sensible. Have you decided on the messaging variations yet?
Anna: We're testing three versions — a fear-based message, a solution-based message, and a control with neutral facts.
Tutor: Excellent. And the timeline?
James: We'll launch the survey on the first of April and close it three weeks later.
Anna: Then we have a fortnight for analysis. Final write-up by the end of May.
Tutor: That's tight but doable. Just make sure your ethics application is in by the end of next week — they take ten working days.
James: We've already submitted it, actually.
Tutor: Even better. One more thing — please update me weekly rather than monthly until launch.`,
    questions: [
      { type: QuestionType.FILL_BLANK, prompt: "Tutor's surname: Dr ___", correctAnswer: "Reed" },
      { type: QuestionType.FILL_BLANK, prompt: "Target number of participants: ___", correctAnswer: "150" },
      { type: QuestionType.MCQ, prompt: "How many message variations will be tested?", options: ["2", "3", "4", "5"], correctAnswer: "3" },
      { type: QuestionType.MCQ, prompt: "When will the survey close?", options: ["Two weeks after launch", "Three weeks after launch", "End of April", "End of May"], correctAnswer: "Three weeks after launch" },
      { type: QuestionType.MCQ, prompt: "Ethics approval takes:", options: ["5 days", "7 days", "10 working days", "2 weeks"], correctAnswer: "10 working days" },
      { type: QuestionType.MCQ, prompt: "How often will the students update the tutor before launch?", options: ["Daily", "Weekly", "Fortnightly", "Monthly"], correctAnswer: "Weekly" },
    ],
  },
  {
    title: "Section 4 — Lecture: Sleep and Memory",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Today we'll look at how sleep contributes to memory, drawing on neuroscience research from the past two decades.

We sleep in cycles of approximately ninety minutes, alternating between non-REM and REM phases. Non-REM sleep is itself divided into three stages, with stage three — slow-wave sleep — being the deepest. During slow-wave sleep, the hippocampus replays patterns of activity that occurred during the day, and these patterns are gradually transferred to the neocortex for long-term storage.

REM sleep, the dreaming phase, is associated with a different kind of consolidation. Studies show that REM strengthens emotional memories and integrates new information with existing knowledge in surprising ways. Many creative breakthroughs are reported after a good night's sleep — Dmitri Mendeleev claimed the periodic table came to him in a dream.

Sleep deprivation impairs memory formation in measurable ways. A single night of poor sleep can reduce the brain's ability to form new memories by up to forty per cent. Chronic deprivation, common in shift workers, is now linked to increased risk of Alzheimer's disease.

For students, the practical message is simple: cramming late at night is counterproductive. Studying earlier and getting a full night's sleep produces better recall the next morning than studying further into the early hours. Spaced repetition — reviewing material across several sleep cycles — is more effective still.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "How long is a typical sleep cycle?", options: ["60 minutes", "90 minutes", "2 hours", "3 hours"], correctAnswer: "90 minutes" },
      { type: QuestionType.FILL_BLANK, prompt: "The deepest sleep stage is called ___-wave sleep.", correctAnswer: "slow" },
      { type: QuestionType.MCQ, prompt: "Who claimed the periodic table came to him in a dream?", options: ["Einstein", "Newton", "Mendeleev", "Darwin"], correctAnswer: "Mendeleev" },
      { type: QuestionType.FILL_BLANK, prompt: "A single night of poor sleep can reduce new memory formation by up to ___ per cent.", correctAnswer: "40" },
      { type: QuestionType.MCQ, prompt: "What does the lecturer recommend instead of late cramming?", options: ["No sleep", "Studying earlier + full night's sleep", "Drinking coffee", "All-night study groups"], correctAnswer: "Studying earlier + full night's sleep" },
      { type: QuestionType.TRUE_FALSE, prompt: "Chronic sleep deprivation is linked to Alzheimer's risk.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "Section 1 — Restaurant Reservation",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Host: Bella Vista restaurant, good evening. How can I help you?
Caller: Hi, I'd like to book a table for Saturday evening, please.
Host: Of course. For how many people?
Caller: Six adults and two children.
Host: That's eight in total. What time would suit?
Caller: Around seven thirty if possible.
Host: We have a table available at seven forty-five — would that work?
Caller: That's fine.
Host: Lovely. May I take a name and number?
Caller: It's for the Watson family. My number is 020 7946 0844.
Host: Any dietary requirements?
Caller: Yes — one vegetarian, and my son has a peanut allergy.
Host: Noted. I'll flag both with the chef. We'll see you Saturday at quarter to eight, table for eight.`,
    questions: [
      { type: QuestionType.FILL_BLANK, prompt: "Family name: ___", correctAnswer: "Watson" },
      { type: QuestionType.FILL_BLANK, prompt: "Number of adults: ___", correctAnswer: "6" },
      { type: QuestionType.MCQ, prompt: "Confirmed reservation time:", options: ["7:00", "7:30", "7:45", "8:00"], correctAnswer: "7:45" },
      { type: QuestionType.MCQ, prompt: "Allergy mentioned:", options: ["Dairy", "Gluten", "Peanut", "Shellfish"], correctAnswer: "Peanut" },
      { type: QuestionType.FILL_BLANK, prompt: "Phone number: 020 7946 ___", correctAnswer: "0844" },
    ],
  },
  {
    title: "Section 2 — Gym Induction",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Welcome to FitWorks Gym! I'm Liam, your induction trainer. Let me walk you through the basics.

We're open from six in the morning to ten at night, Monday through Friday. Weekends are slightly shorter — eight a.m. to eight p.m. The gym is busiest between five and seven in the evening on weekdays, so if you can come earlier or later, you'll have more equipment available.

On your right is the cardio area, with treadmills, bikes, and rowers. Beyond that is the free-weights section, which we ask you to share considerately during peak hours. To the left, the studio hosts group classes — yoga, spin, HIIT, and pilates. You can book classes through our app up to seven days in advance. Walk-ins are allowed if there's space.

Lockers are coin-operated, but the coin returns when you unlock. Showers have free shampoo and shower gel. Please bring your own towel; rentals are available at reception for two pounds.

Our personal training sessions are sixty pounds an hour, or four hundred pounds for a block of eight. Many members find the introductory programme — three sessions for ninety pounds — a good way to start.

Any questions before we begin the equipment tour?`,
    questions: [
      { type: QuestionType.FILL_BLANK, prompt: "Trainer's name: ___", correctAnswer: "Liam" },
      { type: QuestionType.MCQ, prompt: "Weekend opening hours:", options: ["6 a.m.–10 p.m.", "8 a.m.–8 p.m.", "9 a.m.–6 p.m.", "10 a.m.–10 p.m."], correctAnswer: "8 a.m.–8 p.m." },
      { type: QuestionType.MCQ, prompt: "Classes can be booked in advance via the app up to:", options: ["3 days", "5 days", "7 days", "14 days"], correctAnswer: "7 days" },
      { type: QuestionType.FILL_BLANK, prompt: "Towel rental cost: ___ pounds", correctAnswer: "2" },
      { type: QuestionType.FILL_BLANK, prompt: "Cost of introductory programme (3 sessions): ___ pounds", correctAnswer: "90" },
      { type: QuestionType.MCQ, prompt: "Busiest time on weekdays:", options: ["7-9 a.m.", "12-2 p.m.", "5-7 p.m.", "8-10 p.m."], correctAnswer: "5-7 p.m." },
    ],
  },
  {
    title: "Section 4 — Lecture: Urban Trees",
    audioUrl: "",
    timeLimit: 600,
    transcript: `Today we'll discuss the role of urban trees, drawing on research from environmental science and public health.

Urban trees deliver multiple ecosystem services. Most obviously, they cool the air through evapotranspiration — a single mature tree can have a cooling effect equivalent to several domestic air conditioners. In summer, well-shaded streets can be five to ten degrees Celsius cooler than treeless ones.

Trees also intercept rainfall, reducing runoff and pressure on drainage systems. A study in New York estimated that the city's tree canopy intercepts roughly nine hundred million gallons of stormwater annually, saving tens of millions in infrastructure costs.

Air quality benefits are mixed. Trees trap particulate matter on their leaves and absorb gaseous pollutants like nitrogen dioxide. However, some species also emit volatile organic compounds that can react with pollutants to form ozone. Species selection matters: oaks, for example, are high VOC emitters, while many maples are low.

Beyond environmental benefits, urban trees correlate with public health outcomes. Residents of leafier neighbourhoods report lower stress, less depression, and better birth outcomes, even after controlling for income. Hospital patients with views of trees recover faster, a finding now incorporated into healthcare design.

The challenges are real. Climate change brings new pests and droughts, and tight municipal budgets cut tree-care first. But the economic case is strong: every dollar invested in urban forestry returns between two and five in benefits.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Well-shaded streets can be how much cooler than treeless ones?", options: ["1-3°C", "5-10°C", "12-15°C", "Over 20°C"], correctAnswer: "5-10°C" },
      { type: QuestionType.FILL_BLANK, prompt: "New York's tree canopy intercepts about ___ million gallons of stormwater annually.", correctAnswer: "900" },
      { type: QuestionType.MCQ, prompt: "Which species are mentioned as HIGH VOC emitters?", options: ["Pines", "Maples", "Oaks", "Birches"], correctAnswer: "Oaks" },
      { type: QuestionType.TRUE_FALSE, prompt: "Hospital patients with views of trees recover faster.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "Every dollar invested in urban forestry returns:", options: ["1-2 in benefits", "2-5 in benefits", "5-10 in benefits", "10+ in benefits"], correctAnswer: "2-5 in benefits" },
    ],
  },
];
