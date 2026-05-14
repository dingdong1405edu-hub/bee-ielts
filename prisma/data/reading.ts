import { CEFRLevel, QuestionType } from "@prisma/client";

export interface ReadingData {
  title: string;
  level: CEFRLevel;
  timeLimit: number;
  passage: string;
  questions: {
    type: QuestionType;
    prompt: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
  }[];
}

export const READING_TESTS: ReadingData[] = [
  {
    title: "The History of Coffee",
    level: CEFRLevel.B1,
    timeLimit: 1200,
    passage: `Coffee is one of the most consumed beverages in the world. Its history can be traced back to ancient coffee forests on the Ethiopian plateau, where legend says a goat herder named Kaldi first discovered the potential of these beloved beans. Kaldi noticed that his goats became so energetic after eating berries from a certain tree, they did not want to sleep at night. Kaldi reported his findings to the abbot of the local monastery, who made a drink with the berries and found that it kept him alert through long evening prayers.

By the 15th century, coffee was being grown in the Yemeni district of Arabia, and by the 16th century, it was known in Persia, Egypt, Syria, and Turkey. Coffee was not only enjoyed in homes, but also in the many public coffee houses — called qahveh khaneh — which began to appear in cities across the Near East. Patrons engaged in all manner of social activity, listened to music, watched performers, played chess, and kept current on the news.

European travelers to the Near East brought back stories of an unusual dark black beverage. By the 17th century, coffee had made its way to Europe and was becoming popular across the continent. Some people reacted to this new beverage with suspicion or fear, calling it the "bitter invention of Satan". The local clergy condemned coffee when it came to Venice in 1615. The controversy was so great that Pope Clement VIII was asked to intervene. He decided to taste the beverage for himself before making a decision, and found the drink so satisfying that he gave it papal approval.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Who is said to have discovered coffee?", options: ["A monk", "A king", "A goat herder named Kaldi", "An Ethiopian farmer"], correctAnswer: "A goat herder named Kaldi" },
      { type: QuestionType.TRUE_FALSE, prompt: "Coffee houses in the Near East were called 'qahveh khaneh'.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "Why did Pope Clement VIII approve coffee?", options: ["He never tried it", "He found it satisfying", "He was forced by his court", "He thought it was healthy"], correctAnswer: "He found it satisfying" },
      { type: QuestionType.FILL_BLANK, prompt: "Coffee was being grown in the ___ district of Arabia by the 15th century.", correctAnswer: "Yemeni" },
      { type: QuestionType.TRUE_FALSE, prompt: "Coffee was welcomed without controversy in Europe.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "Bicycle Boom in Cities",
    level: CEFRLevel.B1,
    timeLimit: 1200,
    passage: `In recent decades, cycling has experienced a remarkable revival in cities around the world. What was once seen as outdated transport has become a symbol of modern, sustainable urban living. Cities such as Copenhagen, Amsterdam, and Utrecht have led the way, investing heavily in bike lanes, secure parking, and traffic systems that prioritise cyclists.

The benefits are clear. Cyclists arrive at work less stressed, save money on fuel, and produce no air pollution. Studies show that regular cyclists tend to be healthier and live longer than non-cyclists. Cities benefit too: less congestion, lower noise levels, and reduced demand for parking space mean streets become more pleasant for everyone.

However, the transition is not without challenges. Drivers sometimes complain that bike lanes take road space away from cars. In some areas, fast e-bikes have raised concerns about pedestrian safety. Cycling in heavy rain or extreme heat remains uncomfortable, and theft is a persistent problem in many city centres.

Despite these issues, the trend appears unstoppable. As more people experience the freedom and convenience of cycling, demand for better infrastructure grows. Many city planners now consider safe cycle networks as essential as roads or public transport.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Which three cities are mentioned as leaders in cycling infrastructure?", options: ["Paris, London, Berlin", "Copenhagen, Amsterdam, Utrecht", "New York, Tokyo, Sydney", "Hanoi, Bangkok, Jakarta"], correctAnswer: "Copenhagen, Amsterdam, Utrecht" },
      { type: QuestionType.TRUE_FALSE, prompt: "Cyclists tend to live longer than non-cyclists according to the passage.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "What complaint do some drivers have?", options: ["Cyclists are too slow", "Bike lanes take away road space", "Bikes pollute the air", "Cycling is expensive"], correctAnswer: "Bike lanes take away road space" },
      { type: QuestionType.FILL_BLANK, prompt: "Theft is a persistent problem in many city ___.", correctAnswer: "centres" },
    ],
  },
  {
    title: "How Honeybees Communicate",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Honeybees are masters of communication, despite having brains the size of a grass seed. When a forager bee finds a rich source of nectar, she returns to the hive and performs an elaborate "waggle dance" on the vertical comb. The angle of the dance, relative to the vertical, indicates the direction of the food source relative to the sun. The duration of each waggle phase indicates the distance.

This remarkable behaviour was first decoded by Austrian zoologist Karl von Frisch in the 1940s, work that earned him the Nobel Prize in Physiology or Medicine in 1973. For decades, some scientists doubted that bees could actually transmit such precise information through dance alone. Recent experiments using miniature radar transponders, however, have confirmed that bees following a dancer fly almost directly to the indicated food source.

Beyond the dance, bees also use chemical signals — pheromones — to coordinate hive activities. A queen produces specific pheromones that maintain colony cohesion; if she dies, workers detect the change within hours and begin raising a new queen. Alarm pheromones can summon defenders in seconds, while trail pheromones help guide returning foragers.

The sophistication of bee communication has practical implications. Understanding how bees signal nectar quality is helping researchers monitor environmental health, since pollutants and habitat loss disrupt these signals. Some scientists argue that protecting bee communication is, indirectly, protecting the agricultural systems that feed billions.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What does the angle of the waggle dance indicate?", options: ["Quality of nectar", "Direction relative to the sun", "Distance to the source", "Number of bees needed"], correctAnswer: "Direction relative to the sun" },
      { type: QuestionType.FILL_BLANK, prompt: "Karl von Frisch decoded bee communication and won the Nobel Prize in ___.", correctAnswer: "1973" },
      { type: QuestionType.TRUE_FALSE, prompt: "Bees use only dance to communicate.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "What happens when a queen dies?", options: ["The colony immediately dies", "Workers raise a new queen", "Bees abandon the hive", "Foragers stop dancing"], correctAnswer: "Workers raise a new queen" },
      { type: QuestionType.FILL_BLANK, prompt: "Researchers monitor environmental health using bee communication because pollutants disrupt their ___.", correctAnswer: "signals" },
      { type: QuestionType.TRUE_FALSE, prompt: "Recent experiments confirmed bees fly to the location indicated by the dance.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "The Rise of Remote Work",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `The COVID-19 pandemic accelerated a shift toward remote work that many experts believe is permanent. Before 2020, working from home was a niche perk offered by a small number of forward-thinking companies. By 2023, more than 40 percent of knowledge workers in developed economies spent at least part of the week working remotely.

For employees, the appeal is clear. Eliminating the daily commute saves time and money, while greater flexibility helps balance professional and family responsibilities. Some workers report higher productivity in quieter home environments, freed from constant office interruptions.

Employers see advantages too. Companies that allow remote work can recruit globally, drawing on a wider talent pool. Office costs fall when fewer employees need permanent desks. Surveys suggest that remote workers tend to stay longer with their employers, reducing the expense of turnover.

However, remote work also poses risks. Junior staff may struggle to build networks and absorb company culture without face-to-face interaction. Innovation, which often emerges from chance conversations, can decline. Managers report difficulty in monitoring engagement and giving meaningful feedback through video calls alone.

Most large organisations have settled on a hybrid model, with employees in the office two or three days a week. Whether this represents a stable equilibrium or merely a transitional phase remains to be seen. What is clear is that the traditional office, designed for nine-to-five attendance five days a week, is unlikely to return as the default.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What percentage of knowledge workers worked remotely at least part-time by 2023?", options: ["20%", "More than 40%", "60%", "80%"], correctAnswer: "More than 40%" },
      { type: QuestionType.TRUE_FALSE, prompt: "Companies say remote workers tend to leave their jobs more quickly.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "What problem does the writer mention for junior staff?", options: ["Lower pay", "Difficulty absorbing company culture", "Longer working hours", "Less holiday time"], correctAnswer: "Difficulty absorbing company culture" },
      { type: QuestionType.FILL_BLANK, prompt: "Most large organisations have settled on a ___ model.", correctAnswer: "hybrid" },
      { type: QuestionType.TRUE_FALSE, prompt: "The writer believes the traditional 9-to-5, 5-day office is likely to return.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "The Threat to Coral Reefs",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Coral reefs occupy less than one per cent of the ocean floor, yet they support roughly a quarter of all marine species. They also protect coastlines from storms and provide livelihoods, through fishing and tourism, for hundreds of millions of people. Today, these vital ecosystems are under unprecedented threat.

The principal cause is rising sea temperatures, driven by climate change. Corals live in a delicate partnership with microscopic algae called zooxanthellae, which give them colour and most of their energy. When water grows too warm, corals expel the algae and turn ghostly white — a process known as "bleaching". Bleached corals are not dead, but they are weakened and may die if the heat persists.

Other threats compound the problem. Ocean acidification, caused by the absorption of carbon dioxide, makes it harder for corals to build their calcium-carbonate skeletons. Overfishing removes the herbivores that keep algae in check, while pollution and sediment from coastal development smother reefs. Outbreaks of crown-of-thorns starfish, themselves linked to nutrient pollution, devour coral tissue at devastating rates.

Scientists are testing several recovery strategies. Coral nurseries cultivate fragments which are later transplanted to degraded reefs. Researchers are also breeding "super corals" with enhanced heat tolerance. Such interventions can help in specific locations, but most experts agree they cannot keep pace with the global warming behind the crisis. Only deep cuts in greenhouse gas emissions can preserve reefs at the scale they currently exist.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What percentage of the ocean floor do coral reefs occupy?", options: ["Less than 1%", "About 5%", "Around 10%", "Over 20%"], correctAnswer: "Less than 1%" },
      { type: QuestionType.FILL_BLANK, prompt: "Corals live in partnership with algae called ___.", correctAnswer: "zooxanthellae" },
      { type: QuestionType.TRUE_FALSE, prompt: "Bleached corals are immediately dead.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "What is NOT mentioned as a threat to corals?", options: ["Rising temperatures", "Acidification", "Overfishing", "Oil spills"], correctAnswer: "Oil spills" },
      { type: QuestionType.TRUE_FALSE, prompt: "Most experts believe coral nurseries alone can solve the crisis.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "The Psychology of Procrastination",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Procrastination is often mistaken for laziness, but psychologists who study the phenomenon insist that the two are fundamentally different. Lazy individuals lack motivation; procrastinators frequently want to act and feel anxious about delaying, yet are unable to begin. The mismatch between intention and behaviour places procrastination firmly within the domain of emotion regulation rather than time management.

Research by Tim Pychyl and others suggests that procrastination is essentially a strategy for avoiding negative feelings. A task that seems boring, threatening to self-esteem, or simply ambiguous triggers discomfort. By turning to a more pleasurable activity, the procrastinator obtains immediate relief. The relief, however, is short-lived; deadlines loom larger, guilt accumulates, and self-criticism intensifies. Far from reducing stress, chronic procrastination compounds it.

Brain imaging adds biological texture to this picture. Habitual procrastinators show enlarged amygdalae and weaker connections between the amygdala and the prefrontal cortex. In other words, the regions associated with emotional reactivity are hyper-responsive while the regions that exert deliberate control are comparatively quiet. This neural profile makes it easier to understand why willpower exhortations rarely succeed.

Effective interventions, therefore, tend to target emotion rather than scheduling. Self-compassion, paradoxically, predicts faster recovery from a procrastination episode than self-blame. Brief implementation intentions — explicit if-then plans — bypass the moment of decision that procrastinators find paralysing. Even modest steps, such as opening a document or reading one page, can lower the emotional barrier enough for momentum to build. The strategies are simple; the difficulty lies in remembering them when the discomfort returns.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "According to the passage, procrastination is mainly about:", options: ["Time management", "Emotion regulation", "Laziness", "Memory"], correctAnswer: "Emotion regulation" },
      { type: QuestionType.TRUE_FALSE, prompt: "Procrastinators usually lack motivation to act.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "What does brain imaging suggest about habitual procrastinators?", options: ["Smaller amygdala", "Stronger prefrontal cortex", "Weaker connection between amygdala and prefrontal cortex", "No difference in brain structure"], correctAnswer: "Weaker connection between amygdala and prefrontal cortex" },
      { type: QuestionType.FILL_BLANK, prompt: "Brief if-then plans are called implementation ___.", correctAnswer: "intentions" },
      { type: QuestionType.TRUE_FALSE, prompt: "Self-compassion is shown to slow recovery from procrastination.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "Why do willpower exhortations rarely succeed for procrastinators?", options: ["They are too vague", "The emotional regions overpower deliberate control", "They are not loud enough", "Procrastinators don't hear them"], correctAnswer: "The emotional regions overpower deliberate control" },
    ],
  },
  {
    title: "The Economics of Happiness",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `For most of the twentieth century, economists measured national progress with a single yardstick: gross domestic product. The implicit assumption was that more output meant more wellbeing. From the 1970s onward, however, a small group of researchers began to question that assumption. They noticed a curious pattern: even as rich countries grew richer, average reported happiness barely changed.

The Easterlin paradox, named after economist Richard Easterlin, captured the puzzle. Within a country at a given time, richer individuals report higher life satisfaction than poorer ones. Yet across decades, doubling national income produces little or no increase in average happiness. Various explanations have been offered. People may adapt rapidly to higher consumption levels, so the boost from a new car fades quickly. Status comparisons matter: what counts is not absolute income, but income relative to one's peers.

Recent research has refined the picture. Daniel Kahneman and Angus Deaton distinguished between emotional wellbeing — how one feels day to day — and life evaluation — overall judgement of one's life. They found that emotional wellbeing improves with income only up to roughly $75,000 in the United States, after which the effect flattens. Life evaluation, by contrast, continues to rise modestly with income at higher levels.

These findings have policy consequences. Several governments now publish wellbeing indicators alongside GDP. Bhutan famously measures "gross national happiness". The United Kingdom, New Zealand, and Iceland have introduced budgeting frameworks that explicitly weigh non-economic outcomes such as mental health and social connection. Critics warn that wellbeing data is subjective and easy to manipulate. Supporters counter that GDP suffers from similar problems and was never designed to capture everything that matters.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What is the Easterlin paradox?", options: ["Richer countries have more happiness", "Income and happiness are unrelated", "Within a country richer people are happier, but national wealth growth doesn't raise national happiness", "Happiness causes higher income"], correctAnswer: "Within a country richer people are happier, but national wealth growth doesn't raise national happiness" },
      { type: QuestionType.FILL_BLANK, prompt: "Kahneman and Deaton found emotional wellbeing flattens above roughly $___ in the US.", correctAnswer: "75,000" },
      { type: QuestionType.TRUE_FALSE, prompt: "Bhutan measures gross national happiness as a national indicator.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "Which is NOT mentioned as a country that introduced wellbeing budgeting frameworks?", options: ["UK", "New Zealand", "Iceland", "Norway"], correctAnswer: "Norway" },
      { type: QuestionType.TRUE_FALSE, prompt: "Critics argue wellbeing data is purely objective.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "Why We Sleep",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Sleep occupies roughly a third of human life, yet for centuries scientists struggled to explain why an animal would spend so much time in such a vulnerable state. Modern research has begun to lift the veil, revealing functions that are anything but passive.

Memory consolidation is perhaps the most documented role of sleep. During slow-wave sleep, the brain replays newly formed memories, strengthening neural connections that store them. REM sleep, by contrast, is linked to creative problem-solving and emotional processing. Studies in which subjects learn a task and then sleep, compared with those who stay awake for similar periods, consistently show better retention in the sleepers.

Sleep also serves a janitorial function. The glymphatic system, discovered only in 2012, clears metabolic waste from the brain. This cleansing is up to ten times more efficient during sleep than during waking hours, and it removes proteins such as beta-amyloid, whose accumulation has been linked to Alzheimer's disease. Chronic sleep deprivation may therefore contribute to neurodegeneration.

Despite the evidence, modern lifestyles steadily erode sleep. Artificial lighting suppresses melatonin, the hormone that triggers sleepiness. Screens emit blue light that further delays the body clock. Work demands, social media, and the gig economy combine to push bedtimes later, while wake times are often fixed by school or work. Researchers warn that the cumulative effect on public health is severe but largely invisible. Tiredness has become normalised; many adults underestimate how impaired they are by the loss of just an hour or two of sleep.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Which stage of sleep is most associated with memory consolidation?", options: ["REM sleep", "Slow-wave sleep", "Light sleep", "Wakefulness"], correctAnswer: "Slow-wave sleep" },
      { type: QuestionType.TRUE_FALSE, prompt: "The glymphatic system was discovered in 2012.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "What protein is mentioned in connection with Alzheimer's?", options: ["Insulin", "Beta-amyloid", "Haemoglobin", "Collagen"], correctAnswer: "Beta-amyloid" },
      { type: QuestionType.FILL_BLANK, prompt: "Screens emit ___ light that delays the body clock.", correctAnswer: "blue" },
      { type: QuestionType.TRUE_FALSE, prompt: "Many adults overestimate the impairment from losing an hour of sleep.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "The Origins of Writing",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Writing emerged independently in at least three regions: Mesopotamia, around 3200 BCE; China, around 1200 BCE; and Mesoamerica, around 600 BCE. Each system began with concrete pictographs and gradually evolved toward abstract signs capable of representing speech sounds.

The earliest Mesopotamian tablets were not literature but accounting records: tallies of barley, oil, sheep. Scribes pressed wedge-shaped marks into wet clay, producing the cuneiform script. Over centuries, the inventory of signs shrank and their phonetic value expanded, until the script could record diplomatic correspondence, hymns, and the epic of Gilgamesh.

Chinese writing followed a different trajectory. Oracle bone inscriptions from the Shang dynasty record questions put to ancestors and gods, with answers interpreted from cracks in the heated bone. Although the medium changed — to bronze, then bamboo, then paper — the visual logic endured, and modern Chinese characters retain a recognisable kinship with their Shang predecessors.

In Mesoamerica, the Maya developed a sophisticated script combining logograms and syllabic signs. Until the late twentieth century, scholars could read only the number system and dates; the rest seemed impenetrable. A breakthrough came when researchers recognised that many Maya signs were phonetic, allowing names of kings and gods to be deciphered. Today, more than ninety per cent of surviving Maya texts can be read, though most concern dynastic propaganda rather than the philosophy or literature that the inscriptions sometimes hint at.

Writing transformed the societies that adopted it. Laws could be standardised, contracts enforced across generations, knowledge accumulated beyond the limits of individual memory. Some historians argue that writing was the technology that made the state possible. Others see it as a consequence rather than a cause. Either way, the surviving inscriptions of these ancient cultures provide our most direct line to minds that have otherwise vanished.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "In which region was writing developed earliest?", options: ["China", "Mesoamerica", "Mesopotamia", "Egypt"], correctAnswer: "Mesopotamia" },
      { type: QuestionType.FILL_BLANK, prompt: "The earliest Mesopotamian tablets recorded ___ rather than literature.", correctAnswer: "accounting" },
      { type: QuestionType.TRUE_FALSE, prompt: "Maya inscriptions remained largely undecipherable until the late 20th century.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "Chinese oracle bone inscriptions recorded:", options: ["Trade records", "Diplomatic letters", "Questions to ancestors and gods", "Tax accounts"], correctAnswer: "Questions to ancestors and gods" },
      { type: QuestionType.FILL_BLANK, prompt: "More than ___ percent of surviving Maya texts can now be read.", correctAnswer: "ninety" },
    ],
  },
  {
    title: "Smart Cities",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `The term "smart city" describes urban environments where digital technology is integrated into public services to improve efficiency, sustainability, and quality of life. Sensors collect data on traffic, air quality, energy use, and waste levels; software then turns this data into decisions, sometimes automatically.

Several cities have become well-known examples. Singapore monitors thousands of cameras and sensors to manage congestion and detect crime patterns. Barcelona has installed smart street lighting that dims when no one is around, reducing energy consumption substantially. Seoul offers free Wi-Fi across most public spaces and uses real-time data to optimise public transport.

The benefits are tangible. Emergency responders arrive faster when traffic signals clear their path automatically. Water leaks are detected before they flood streets. Air-quality alerts can warn vulnerable residents on bad days. Such gains explain why governments worldwide are eager to invest in smart-city pilots.

Yet the model has critics. Mass surveillance raises serious privacy concerns, particularly when facial recognition is deployed without public consent. Smart systems depend on continuous data flow and are vulnerable to cyber-attacks; in 2018, a ransomware attack paralysed services in Atlanta for weeks. There is also the question of equity: high-tech infrastructure is expensive, and communities that lack digital literacy may find themselves excluded rather than empowered.

The next decade is likely to see refinements rather than revolutions. Cities increasingly combine technology with low-tech improvements — better cycle paths, more green space, citizen panels with real decision power. The smartest cities, advocates argue, will be those that put people first and treat technology as a tool, not a goal.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Which city is mentioned in connection with smart street lighting?", options: ["Singapore", "Seoul", "Barcelona", "Atlanta"], correctAnswer: "Barcelona" },
      { type: QuestionType.TRUE_FALSE, prompt: "Smart cities are immune to cyber-attacks.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "What concern is raised about facial recognition?", options: ["High cost", "Privacy without consent", "Slow speed", "Energy use"], correctAnswer: "Privacy without consent" },
      { type: QuestionType.FILL_BLANK, prompt: "A ransomware attack in 2018 paralysed services in ___.", correctAnswer: "Atlanta" },
      { type: QuestionType.TRUE_FALSE, prompt: "The author believes the best smart cities prioritise technology over people.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "The Vanishing Glaciers",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Glaciers cover about ten per cent of the world's land surface and store roughly seventy per cent of the planet's fresh water. They are also among the most visible casualties of climate change. Satellite measurements show that the world's glaciers have lost more than nine trillion tonnes of ice since 1960, and the rate of loss is accelerating.

The consequences are felt unevenly. Communities in the Andes and Himalayas depend on glacier meltwater for drinking and irrigation, particularly in the dry season. As glaciers retreat, summer flows initially increase, then dwindle as the ice that fed them disappears. Some experts warn of long-term water insecurity for hundreds of millions of people.

At a global scale, melting glaciers contribute to rising sea levels. Although the Antarctic and Greenland ice sheets dominate the headlines, smaller glaciers — those in mountain ranges and on islands — have contributed nearly a third of recent sea-level rise. This pattern is expected to reverse only after the smaller glaciers have largely melted.

Adaptation strategies vary. Some Swiss communities now cover sections of glacier with reflective blankets to slow melting on the slopes most important for tourism. In the Andes, communities have built artificial glaciers — water sprayed in winter and frozen into "ice stupas" that release water in spring. These efforts are imaginative but local. The underlying driver remains greenhouse gas emissions; without reductions, even the most innovative on-the-ground interventions will be overwhelmed.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Roughly what proportion of fresh water do glaciers store?", options: ["10%", "30%", "50%", "70%"], correctAnswer: "70%" },
      { type: QuestionType.FILL_BLANK, prompt: "Communities in the Andes and ___ rely on glacier meltwater.", correctAnswer: "Himalayas" },
      { type: QuestionType.TRUE_FALSE, prompt: "Smaller mountain glaciers contribute nearly a third of recent sea-level rise.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "What technique do Swiss communities use to slow melting?", options: ["Ice stupas", "Reflective blankets", "Painting glaciers white", "Building tunnels"], correctAnswer: "Reflective blankets" },
      { type: QuestionType.TRUE_FALSE, prompt: "The author believes local adaptation alone will solve the problem.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "Online Misinformation",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `The architecture of social media is uniquely hospitable to misinformation. Algorithms optimised for engagement reward content that arouses strong emotion — anger, fear, moral outrage — regardless of accuracy. False stories therefore tend to travel faster and farther than corrections. A landmark MIT study found that on Twitter, false news reached people six times faster than true news in the first hours of a story's life.

The mechanism is not simply technological. Cognitive biases predispose us to accept information that confirms existing beliefs and to dismiss contradicting evidence. Repeated exposure to a claim, even a flagged one, increases the perceived plausibility of the claim. The "illusory truth" effect operates whether or not the recipient is paying attention.

Platforms have experimented with various countermeasures. Fact-check labels can reduce sharing of flagged content, but they may also harden disbelief among those who distrust the fact-checkers. Algorithmic down-ranking is opaque and accused, by turns, of doing too little and of suppressing legitimate speech. Outright deletion is heavily contested. Each measure tackles symptoms rather than the underlying incentive structure that rewards inflammatory content.

Some scholars argue that the real solution must be structural. Slowing the spread of any single message — through friction such as "are you sure you want to share?" prompts — has reduced misinformation in trials without restricting any specific viewpoint. Others stress media literacy: teaching users, especially young ones, to evaluate sources and pause before sharing. Both approaches recognise that information environments shape behaviour as powerfully as the information itself.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "According to the MIT study, false news reached people ___ times faster than true news.", options: ["Two", "Four", "Six", "Eight"], correctAnswer: "Six" },
      { type: QuestionType.TRUE_FALSE, prompt: "Repeated exposure to a claim decreases perceived plausibility.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "What is described as 'opaque' in the passage?", options: ["Fact-check labels", "Algorithmic down-ranking", "User accounts", "Media literacy"], correctAnswer: "Algorithmic down-ranking" },
      { type: QuestionType.FILL_BLANK, prompt: "Adding 'are you sure you want to share?' prompts is described as introducing ___.", correctAnswer: "friction" },
      { type: QuestionType.TRUE_FALSE, prompt: "Fact-check labels always reduce misinformation belief.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "Algorithms optimised for engagement reward content that:", options: ["Is well-sourced", "Arouses strong emotion", "Is short", "Is fact-checked"], correctAnswer: "Arouses strong emotion" },
    ],
  },
];
