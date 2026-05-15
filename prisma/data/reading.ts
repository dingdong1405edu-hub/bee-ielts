import { CEFRLevel, QuestionType } from "@prisma/client";

export interface ReadingData {
  title: string;
  level: CEFRLevel;
  timeLimit: number;
  passage: string;
  /** Optional 4-slot tag for IELTS-style sessions (A/B/C/D). */
  slot?: "A" | "B" | "C" | "D";
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
  {
    title: "Why Bees Are Disappearing",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Honey bee populations have been declining at an alarming rate across many regions of the world. In some recent years, beekeepers in North America have reported losses of more than thirty percent of their hives over a single winter. Because bees are responsible for pollinating roughly a third of the food crops humans rely on, scientists describe the decline as a serious threat to global agriculture and biodiversity.

There is rarely a single cause behind the deaths. Researchers point instead to a combination of pressures acting together. The Varroa mite, a parasite that feeds on bee larvae and spreads viruses, has spread to almost every continent where honey bees are kept. Industrial agriculture is another major factor: large fields of a single crop offer bees only short, intense bursts of food, and pesticides — particularly a class known as neonicotinoids — can damage their nervous systems even at very low doses.

Climate change adds further stress. Warmer springs cause flowers to bloom earlier than the bees have evolved to expect, creating a mismatch between when food is available and when colonies are ready to forage. Extended droughts reduce the number of wild plants that produce nectar, while heatwaves can kill brood inside the hive.

Some governments have responded with restrictions on the most harmful pesticides, and farmers have begun planting wildflower strips along the edges of their fields to give bees diverse forage. Citizens too are encouraged to keep bee-friendly gardens. Yet ecologists caution that protecting honey bees alone is not enough. Many wild pollinators — solitary bees, hoverflies, butterflies — are in equally serious trouble, and only changes to how land is managed at a large scale can reverse the trend.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Approximately what proportion of human food crops rely on bee pollination?", options: ["A tenth", "A quarter", "A third", "A half"], correctAnswer: "A third" },
      { type: QuestionType.MCQ, prompt: "Which parasite is mentioned as damaging bee larvae and spreading viruses?", options: ["The honey louse", "The Varroa mite", "The wax moth", "The pollen tick"], correctAnswer: "The Varroa mite" },
      { type: QuestionType.TRUE_FALSE, prompt: "Neonicotinoids are described as harmless to bees at low doses.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.FILL_BLANK, prompt: "Warmer springs create a ___ between bloom timing and bee readiness.", correctAnswer: "mismatch" },
      { type: QuestionType.MCQ, prompt: "What do ecologists warn about?", options: ["Protecting honey bees alone is enough", "Wild pollinators are also in trouble", "Pesticides are no longer used", "Climate change has stopped"], correctAnswer: "Wild pollinators are also in trouble" },
      { type: QuestionType.TRUE_FALSE, prompt: "Some farmers plant wildflower strips to give bees more food sources.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "Sleep and Memory",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `For much of the twentieth century, sleep was thought of as a passive state — a kind of nightly shut-down before the brain resumed its real work in the morning. Modern neuroscience has overturned that view. Far from being inactive, the sleeping brain is busy performing some of its most important tasks, particularly those related to memory.

During slow-wave sleep, which dominates the first half of the night, the brain appears to replay the day's experiences. Neurons that fired together while a person was learning a new route, a piece of music or a sequence of words activate again in a compressed pattern. Researchers believe that this replay helps transfer information from the hippocampus, a temporary store, to the cortex, where it can be held for the long term. This is one reason that students who study and then sleep tend to remember material better than those who stay up all night.

REM sleep, by contrast, is when dreams are most vivid. It seems to play a different role: integrating new information with what is already known, and stripping away unnecessary detail. Some scientists describe REM as the brain's "creative phase", linking apparently unrelated ideas in ways that can produce insight. People who are deprived of REM sleep perform worse on tasks that require flexible thinking.

The implications go beyond academic learning. Chronic sleep loss is now linked to a higher risk of dementia, possibly because the brain uses sleep to clear out waste proteins that, when allowed to accumulate, are associated with Alzheimer's disease. Public-health campaigns increasingly treat sleep not as a luxury but as a basic pillar of cognitive and physical health, on a par with diet and exercise.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "How was sleep viewed during much of the twentieth century?", options: ["As an active learning state", "As a passive shut-down", "As harmful to memory", "As only useful for children"], correctAnswer: "As a passive shut-down" },
      { type: QuestionType.MCQ, prompt: "What happens during slow-wave sleep, according to the passage?", options: ["The brain stops working", "Neurons replay daytime patterns", "Dreams become most vivid", "Body temperature rises"], correctAnswer: "Neurons replay daytime patterns" },
      { type: QuestionType.TRUE_FALSE, prompt: "Staying up all night tends to improve memory more than studying then sleeping.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.FILL_BLANK, prompt: "Some scientists describe REM as the brain's '___ phase' for linking ideas.", correctAnswer: "creative" },
      { type: QuestionType.MCQ, prompt: "Chronic sleep loss is linked to which disease in the passage?", options: ["Parkinson's", "Stroke", "Alzheimer's", "Migraine"], correctAnswer: "Alzheimer's" },
      { type: QuestionType.TRUE_FALSE, prompt: "Sleep is now considered a basic pillar of health alongside diet and exercise.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "Urban Farming Takes Root",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Across cities from Singapore to Detroit, vegetables, herbs and even fish are being produced inside the urban landscape itself. Rooftops, abandoned warehouses and the basements of office towers are being converted into farms, supplying restaurants and supermarkets with food grown a few hundred metres from where it is sold.

Several factors are driving the movement. Rapid urbanisation means that more than half of humanity now lives in cities; long, energy-intensive supply chains that move food across continents are increasingly seen as fragile and polluting. Vertical farms, in which crops grow under controlled lighting on stacked trays, can use up to ninety percent less water than conventional farming, and they avoid the use of pesticides because the indoor environment can be sealed against pests.

The economics, however, remain difficult. Electricity for grow-lights is expensive, and the initial cost of fitting out a warehouse with hydroponic equipment can run into millions. Most urban farms therefore focus on high-value crops — salad greens, basil, microgreens — that customers are willing to pay a premium for. Producing wheat or rice this way is not yet realistic.

Beyond food, advocates point to social benefits. Community gardens in low-income neighbourhoods can improve access to fresh produce, provide jobs and turn neglected sites into green spaces. Schools sometimes use rooftop gardens as outdoor classrooms. Critics counter that urban farming, however appealing, can never replace the scale of rural agriculture and may distract attention from the more important reform of how food is produced in the countryside.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Which proportion of humanity now lives in cities?", options: ["A third", "Half", "More than half", "Three quarters"], correctAnswer: "More than half" },
      { type: QuestionType.FILL_BLANK, prompt: "Vertical farms can use up to ___ percent less water than conventional farming.", correctAnswer: "ninety" },
      { type: QuestionType.TRUE_FALSE, prompt: "Urban farms can currently produce staple crops like wheat and rice economically.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "Why do most urban farms focus on salad greens and herbs?", options: ["They grow fastest", "They are high-value crops customers pay a premium for", "They need no light", "They are easier to harvest"], correctAnswer: "They are high-value crops customers pay a premium for" },
      { type: QuestionType.MCQ, prompt: "What do critics of urban farming argue?", options: ["It is too cheap", "It cannot replace the scale of rural agriculture", "It harms cities", "It produces unsafe food"], correctAnswer: "It cannot replace the scale of rural agriculture" },
      { type: QuestionType.TRUE_FALSE, prompt: "Some schools use rooftop gardens as outdoor classrooms.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "How Smell Triggers Memory",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Of all the senses, smell is perhaps the most powerful at evoking memory. A whiff of pine, sun cream or a particular dish can return a person, in vivid detail, to a moment from decades earlier. This phenomenon has been the subject of growing scientific interest.

The strength of the link lies partly in the anatomy of the brain. Signals from the nose travel along the olfactory nerve directly into the limbic system, the region most closely associated with emotion and long-term memory. Other senses, by contrast, take a more roundabout route, passing through the thalamus before reaching emotional centres. The shortcut taken by smell may explain why olfactory memories feel so immediate and emotionally charged.

Smell memories also tend to be older than memories triggered by sound or sight. When researchers ask adults to recall events linked to particular scents, the memories often date from their first decade of life. Memories triggered by visual or verbal cues, in contrast, tend to cluster around adolescence. Some psychologists suggest that this is because childhood is a period of intense first-time exposure to smells, before they become familiar.

Clinicians are beginning to apply these findings. People with dementia sometimes respond strongly to familiar scents, becoming more communicative and emotionally engaged after smelling, say, a perfume worn by a relative. Smell training is also being tested as a way to help people who have lost their sense of smell after viral infections to recover it. Whether or not such treatments prove effective at scale, they confirm that smell, long neglected by Western science, is anything but minor.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Why are olfactory memories felt so immediately?", options: ["They are processed slowly", "They bypass the thalamus and reach the limbic system directly", "They use more brain regions", "They are easier to forget"], correctAnswer: "They bypass the thalamus and reach the limbic system directly" },
      { type: QuestionType.FILL_BLANK, prompt: "Smell memories often date from the first ___ of life.", correctAnswer: "decade" },
      { type: QuestionType.TRUE_FALSE, prompt: "Visual memories tend to cluster around adolescence.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "What benefit do people with dementia sometimes show after smelling familiar scents?", options: ["Faster recovery", "Greater communication and engagement", "Loss of memory", "Reduced appetite"], correctAnswer: "Greater communication and engagement" },
      { type: QuestionType.TRUE_FALSE, prompt: "Smell training is being studied as a recovery tool after viral infections.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "The Economics of Streaming",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `For more than a decade, streaming platforms promised both consumers and creators a new golden age of entertainment: vast libraries available on demand, fairer compensation through scale, and direct access to global audiences. The reality, particularly in the music industry, has turned out to be more complicated.

A streaming service typically pays a fraction of a cent per play of a song. For an artist with millions of plays, this can amount to a meaningful income, but for the vast majority of musicians, whose tracks attract perhaps a few thousand listens, the sums are negligible. The model rewards scale, and scale is hard to achieve without the marketing power of a major label. Independent musicians often find themselves working full-time on social media simply to chase the algorithmic visibility that converts into plays.

Television and film face their own economic puzzles. Subscription services compete fiercely for new shows, driving up production budgets, but they also lose money when subscribers cancel after watching one popular series. To reduce this churn, platforms now release episodes weekly rather than dropping a full season at once, mimicking the broadcast television model that streaming was supposed to replace. Some have introduced advertising tiers, despite years of marketing themselves as ad-free.

Whether these contortions are sustainable remains contested. Optimists argue that streaming has democratised access to culture, allowing audiences anywhere to discover work that would once have been impossible to find. Pessimists reply that the long tail of recommendations is dominated by a handful of major productions, and that the average creator earns less than in earlier media eras.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What does the passage say about per-play payments to musicians?", options: ["They are very high", "They are a fraction of a cent", "They are fixed per artist", "They are paid weekly"], correctAnswer: "They are a fraction of a cent" },
      { type: QuestionType.TRUE_FALSE, prompt: "Independent musicians can typically ignore social media in this model.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "Why have streaming platforms started releasing episodes weekly?", options: ["To make production cheaper", "To reduce subscriber churn", "Because broadcasters demand it", "To increase advertising"], correctAnswer: "To reduce subscriber churn" },
      { type: QuestionType.FILL_BLANK, prompt: "Platforms have introduced ___ tiers despite previously marketing themselves as ad-free.", correctAnswer: "advertising" },
      { type: QuestionType.MCQ, prompt: "What do pessimists about streaming argue?", options: ["Access has improved", "Recommendations are dominated by major productions", "Quality is rising", "Costs are falling"], correctAnswer: "Recommendations are dominated by major productions" },
    ],
  },
  {
    title: "Microplastics in the Ocean",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Plastic pollution is no longer simply a problem of visible debris washed up on beaches. Researchers have found tiny plastic fragments — known as microplastics — in every ocean basin on Earth, from the surface to the deep sea, and from the equator to the polar ice. The fragments are smaller than five millimetres, often invisible to the naked eye, and are produced in many ways: from the breakdown of larger items, from fibres released by synthetic clothing during washing, and from microbeads added to cosmetics before recent bans.

Their distribution is shaped by complex ocean dynamics. Surface currents concentrate plastics into so-called garbage patches, the most famous being a vast accumulation in the North Pacific. However, recent surveys have shown that the seafloor may contain far greater quantities, particularly in deep canyons where currents deposit sinking material. Even Arctic sea ice now contains measurable concentrations, suggesting that no part of the marine environment is untouched.

The ecological impacts are still being mapped. Filter-feeding animals such as mussels and small crustaceans consume microplastics directly, sometimes mistaking them for food. The particles can pass through the gut wall and lodge in tissues, carrying with them pollutants that adhere to plastic surfaces. Whether this leads to harm at the level of populations, rather than individual animals, is hotly contested. Some studies show reduced growth and fertility; others find effects only at concentrations far higher than those measured in the wild.

Policy responses have been uneven. Bans on microbeads in cosmetics, adopted by several countries, address only a small fraction of the input. The far larger source — fibres from textiles and the slow weathering of larger plastic items — would require deeper changes to industrial design and waste management. International negotiations on a binding plastics treaty are ongoing, but progress is slow.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What size threshold defines microplastics?", options: ["Smaller than 5 millimetres", "Smaller than 5 centimetres", "Smaller than 1 millimetre", "Smaller than 1 metre"], correctAnswer: "Smaller than 5 millimetres" },
      { type: QuestionType.TRUE_FALSE, prompt: "Microplastics have been found in Arctic sea ice.", options: ["True", "False"], correctAnswer: "True" },
      { type: QuestionType.MCQ, prompt: "Where might the seafloor contain especially large quantities of microplastics?", options: ["Shallow lagoons", "Deep canyons", "Coral reefs", "Tidal pools"], correctAnswer: "Deep canyons" },
      { type: QuestionType.FILL_BLANK, prompt: "Microplastics can carry ___ that adhere to plastic surfaces into animal tissues.", correctAnswer: "pollutants" },
      { type: QuestionType.MCQ, prompt: "Why are microbead bans considered limited in effect?", options: ["They are unenforced", "They address only a small fraction of plastic input", "They are too expensive", "They came too late"], correctAnswer: "They address only a small fraction of plastic input" },
      { type: QuestionType.TRUE_FALSE, prompt: "The passage states that the harm of microplastics to wild populations is firmly established.", options: ["True", "False"], correctAnswer: "False" },
    ],
  },
  {
    title: "Why Some Languages Are Disappearing",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Linguists estimate that roughly one of the world's seven thousand languages disappears every two weeks. By the end of this century, half are projected to be lost — gone with their last speakers, taking with them ways of describing the natural world, kin relationships, and the past that have no equivalent in larger languages.

Language loss rarely happens through a single catastrophe. More often it follows a slow, generational shift: parents who themselves grew up speaking a minority language choose, often under social pressure, to raise their children in a dominant national language. The choice can be entirely rational. A national language opens doors to schooling, employment and political participation; the minority tongue, by contrast, may be associated with poverty or stigma. Within a generation or two, fluent speakers become elderly, and the chain of transmission breaks.

The reasons such losses matter go beyond sentiment. Each language encodes a distinct conceptual system: terms for plants and animals that biologists have not yet catalogued, navigational vocabularies that have helped Pacific Islanders cross open ocean, complex grammars that have informed cognitive science. When a language vanishes, this knowledge typically vanishes with it, since the written record — where one exists — captures only a fraction of what fluent speakers know.

Revitalisation efforts have had uneven success. Welsh, Maori and Hebrew offer well-known examples of languages whose use has been substantially expanded through schooling, media and official status. Many smaller languages, however, lack the institutional support such efforts require. Digital tools — apps, dictionaries, recordings — have lowered the cost of documentation, but a language preserved only in archives is not the same as a language spoken daily.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "How often does a language disappear, according to linguists?", options: ["Every two days", "Every two weeks", "Every two months", "Every two years"], correctAnswer: "Every two weeks" },
      { type: QuestionType.TRUE_FALSE, prompt: "Language loss usually happens through a single catastrophic event.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "Why do parents often switch to a dominant national language?", options: ["For aesthetic reasons", "Because of access to schooling, employment and politics", "Because minority languages are easier", "Because of legal bans"], correctAnswer: "Because of access to schooling, employment and politics" },
      { type: QuestionType.FILL_BLANK, prompt: "Pacific Islanders' navigational ___ helped them cross open ocean.", correctAnswer: "vocabularies" },
      { type: QuestionType.MCQ, prompt: "Which three languages are cited as relatively successful revitalisation cases?", options: ["Welsh, Maori, Hebrew", "Latin, Welsh, Inuit", "Maori, Cornish, Latin", "Sanskrit, Hebrew, Yiddish"], correctAnswer: "Welsh, Maori, Hebrew" },
      { type: QuestionType.TRUE_FALSE, prompt: "Digital tools have lowered the cost of documentation.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "The Surprising Story of Paper",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Before paper, civilisations wrote on whatever they could shape. The Mesopotamians pressed wedge marks into wet clay. The Egyptians beat strips of papyrus reed into rough sheets. Europeans for centuries scraped and treated animal skins to produce parchment — a material so expensive that monasteries reused old pages by scraping the ink away, leaving ghostly traces that scholars still puzzle over today.

Paper as we know it was invented in China around two thousand years ago. The traditional account credits a court official named Cai Lun, who in 105 CE described soaking and mashing tree bark, hemp, rags and old fishing nets into a pulp, then spreading it on a screen to dry. Whether or not Cai Lun was truly the inventor, the technology spread along the Silk Road over the following centuries, reaching the Islamic world by the eighth century and Europe by the twelfth.

Cheap paper transformed almost every aspect of life it touched. In the Islamic world it underpinned a vast scholarly tradition, supporting books on mathematics, astronomy and medicine. In Europe, paper made possible the printing press: Gutenberg's invention would have been unthinkable on parchment. Affordable printed books, in turn, helped fuel the Reformation, the scientific revolution and the spread of literacy.

The paper economy continues to evolve. Demand for newsprint has collapsed with the rise of digital media, but packaging and tissue products are booming. Concerns about deforestation have driven greater use of recycled fibres and certified sustainable forests. Some researchers, looking ahead, are developing paper-based electronics — sensors and circuits printed on humble cellulose — suggesting that this ancient material may yet find unexpected new uses.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What material did Europeans scrape to make parchment?", options: ["Tree bark", "Animal skins", "Cotton fibres", "Bamboo strips"], correctAnswer: "Animal skins" },
      { type: QuestionType.FILL_BLANK, prompt: "The traditional account credits a Chinese court official named ___ Lun with paper's invention.", correctAnswer: "Cai" },
      { type: QuestionType.MCQ, prompt: "How did paper reach Europe?", options: ["By sea from China", "Along the Silk Road via the Islamic world", "Invented independently in Italy", "Brought by Vikings"], correctAnswer: "Along the Silk Road via the Islamic world" },
      { type: QuestionType.TRUE_FALSE, prompt: "Gutenberg's printing press would have been practical on parchment.", options: ["True", "False"], correctAnswer: "False" },
      { type: QuestionType.MCQ, prompt: "Which paper sector has collapsed in recent decades?", options: ["Tissue", "Packaging", "Newsprint", "Cardboard"], correctAnswer: "Newsprint" },
      { type: QuestionType.TRUE_FALSE, prompt: "Researchers are developing paper-based electronics.", options: ["True", "False"], correctAnswer: "True" },
    ],
  },
  {
    title: "Saving the World's Coral Reefs",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `A. Coral reefs are sometimes called the rainforests of the sea. Although they cover less than one percent of the ocean floor, they shelter roughly a quarter of all marine species. Their three-dimensional structure provides hiding places for small fish, hunting grounds for large predators, and nurseries for many creatures that spend only part of their life cycle on the reef.

B. The reefs themselves are built by tiny animals called coral polyps. Each polyp secretes a hard skeleton of calcium carbonate, and millions of these skeletons cemented together over thousands of years form the familiar mounds and ridges we see today. Inside the living tissue of each polyp live single-celled algae called zooxanthellae. The polyp provides shelter; the algae use sunlight to produce sugars that feed the polyp.

C. This delicate partnership is now under serious threat. When the surrounding water warms even slightly above its usual range, the polyps expel their algae and turn ghostly white — a process known as bleaching. A short bleaching event can be survived if the water cools again, but extended events kill the coral outright. Mass bleaching events were once rare; since the 1990s they have become routine in oceans around the world.

D. Beyond heat, reefs face other pressures. Ocean acidification, driven by carbon dioxide dissolving into seawater, weakens the chemistry that allows polyps to form their skeletons. Overfishing removes the herbivores that keep algae in check, so dead coral surfaces are quickly smothered. Coastal pollution adds nutrients that fuel further algal growth.

E. Scientists are exploring ways to help. Some teams are breeding "super corals" in laboratories — varieties shown to tolerate higher temperatures. Others are restoring damaged reefs by transplanting coral fragments grown on underwater nurseries. Marine protected areas, where fishing is restricted, have been shown to recover faster than unprotected zones. But all researchers stress that these interventions buy time only; the long-term survival of reefs depends on cutting greenhouse-gas emissions worldwide.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Choose the best heading for Paragraph A.", options: ["i. How coral skeletons are formed", "ii. Why reefs are ecologically valuable", "iii. The role of scientists in reef recovery", "iv. Threats from acidification"], correctAnswer: "ii. Why reefs are ecologically valuable" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Choose the best heading for Paragraph B.", options: ["i. How coral skeletons are formed", "ii. Why reefs are ecologically valuable", "iii. Mass bleaching events", "iv. Multiple sources of stress"], correctAnswer: "i. How coral skeletons are formed" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Choose the best heading for Paragraph C.", options: ["i. The biology of polyps", "ii. Restoration projects", "iii. Bleaching: the symbiosis breaks down", "iv. Acidification"], correctAnswer: "iii. Bleaching: the symbiosis breaks down" },
      { type: QuestionType.MATCHING_INFO, prompt: "Which paragraph mentions that mass bleaching events are now common?", options: ["A", "B", "C", "D", "E"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "Which paragraph describes restoration through transplanting fragments?", options: ["A", "B", "C", "D", "E"], correctAnswer: "E" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Coral reefs cover less than 1% of the ocean floor.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Zooxanthellae produce sugars without using sunlight.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most fish on reefs are larger than one metre.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.FILL_BLANK, prompt: "When water warms, polyps expel their algae and become ___.", correctAnswer: "white" },
    ],
  },
  {
    title: "Three Pioneers of Modern Genetics",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Modern genetics rests on the work of three remarkable scientists who lived in very different worlds. Although their discoveries are sometimes treated as a single story, each contributed something distinct and faced different obstacles in being recognised.

Gregor Mendel was a nineteenth-century Augustinian monk who tended a small garden at his monastery in what is now the Czech Republic. Between 1856 and 1863 he cross-pollinated more than 28,000 pea plants and recorded, with extraordinary patience, how characteristics such as flower colour and seed shape were passed on. From these results he formulated the first quantitative laws of inheritance. His paper, published in 1866, was almost entirely ignored. Only in 1900, decades after his death, did other biologists rediscover his work.

Barbara McClintock was an American researcher who began studying maize in the 1920s. By tracking the colours that appeared on the kernels of individual cobs, she came to believe that genes could move from one position to another on the chromosome — a phenomenon she called "transposition". The idea contradicted the prevailing view that genes occupied fixed locations, and for years it was treated with scepticism. McClintock continued her experiments quietly. In 1983, more than thirty years after her original publications, she received the Nobel Prize in Physiology or Medicine.

Rosalind Franklin trained as a physical chemist and joined a laboratory at King's College London in 1951. Using X-ray diffraction, she produced photographs of DNA whose clarity allowed measurements of the molecule's helical structure for the first time. One image, known as Photograph 51, was shown without her knowledge to James Watson, whose model of DNA — published in 1953 with Francis Crick — drew directly on her data. Franklin died of cancer in 1958 at the age of 37, four years before the Nobel Prize was awarded for the discovery of the double helix.`,
    questions: [
      { type: QuestionType.MATCHING_FEATURES, prompt: "Who studied maize kernels and discovered transposition?", options: ["Gregor Mendel", "Barbara McClintock", "Rosalind Franklin"], correctAnswer: "Barbara McClintock" },
      { type: QuestionType.MATCHING_FEATURES, prompt: "Who worked alone in a monastery garden in the 19th century?", options: ["Gregor Mendel", "Barbara McClintock", "Rosalind Franklin"], correctAnswer: "Gregor Mendel" },
      { type: QuestionType.MATCHING_FEATURES, prompt: "Whose X-ray photograph was shown to another researcher without consent?", options: ["Gregor Mendel", "Barbara McClintock", "Rosalind Franklin"], correctAnswer: "Rosalind Franklin" },
      { type: QuestionType.MATCHING_FEATURES, prompt: "Who received recognition only decades after their original publications?", options: ["Gregor Mendel only", "Barbara McClintock only", "Both Mendel and McClintock"], correctAnswer: "Both Mendel and McClintock" },
      { type: QuestionType.MATCHING_SENTENCE_ENDINGS, prompt: "Mendel's 1866 paper", options: ["was ignored at first and rediscovered around 1900.", "won him the Nobel Prize immediately.", "was rejected by all journals at the time.", "was based mostly on theoretical mathematics."], correctAnswer: "was ignored at first and rediscovered around 1900." },
      { type: QuestionType.MATCHING_SENTENCE_ENDINGS, prompt: "Barbara McClintock's idea that genes can move", options: ["was accepted immediately by the scientific community.", "contradicted the dominant view of her time.", "was inspired by Mendel's work on peas.", "applied only to fruit flies."], correctAnswer: "contradicted the dominant view of her time." },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Rosalind Franklin received the Nobel Prize before her death.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Mendel cross-pollinated more than 28,000 pea plants.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "McClintock was born in the same country as Mendel.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.FILL_BLANK, prompt: "Franklin's famous DNA image is known as Photograph ___.", correctAnswer: "51" },
    ],
  },
  {
    title: "The Development of Renewable Energy",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `A. For much of modern history, global energy demand has been largely met by fossil fuels such as coal, oil and natural gas. These resources have powered industrial development and economic growth for over a century. However, concerns about environmental damage and climate change have prompted governments and scientists to search for cleaner alternatives.

B. Solar energy has become one of the most promising renewable energy sources. By using photovoltaic panels, sunlight can be converted directly into electricity. As technology has improved, the cost of solar power has fallen significantly, allowing more households and businesses to adopt this form of energy.

C. Wind energy has also expanded rapidly in recent decades. Large wind turbines installed on land or offshore can generate substantial amounts of electricity. Many countries have invested heavily in wind farms as part of their strategy to reduce carbon emissions and decrease dependence on fossil fuels.

D. Despite the rapid growth of renewable energy technologies, several obstacles remain. Renewable sources such as solar and wind are dependent on weather conditions, meaning electricity production may fluctuate throughout the day. This variability creates challenges for maintaining a stable energy supply.

E. To address these limitations, researchers are developing advanced energy storage technologies. Large-scale batteries and other storage systems can store excess electricity generated during periods of high production and release it when demand increases. Such solutions are essential for ensuring the reliability of renewable energy systems.

F. As renewable energy continues to develop, international cooperation has become increasingly important. Governments, scientific institutions and private companies are collaborating to share knowledge, improve technology and accelerate the global transition toward sustainable energy systems.`,
    questions: [
      // Group 1: Matching Headings (Q1–6) — 8 headings, 6 paragraphs (2 distractors)
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: ["i. International collaboration in renewable energy development", "ii. The role of energy storage technologies", "iii. The growing use of wind power", "iv. The historical dependence on fossil fuels", "v. The advantages and growth of solar power", "vi. The challenges of relying on renewable energy", "vii. Government taxation on fossil fuels", "viii. Public opposition to wind farms"], correctAnswer: "iv. The historical dependence on fossil fuels" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: ["i. International collaboration in renewable energy development", "ii. The role of energy storage technologies", "iii. The growing use of wind power", "iv. The historical dependence on fossil fuels", "v. The advantages and growth of solar power", "vi. The challenges of relying on renewable energy", "vii. Government taxation on fossil fuels", "viii. Public opposition to wind farms"], correctAnswer: "v. The advantages and growth of solar power" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: ["i. International collaboration in renewable energy development", "ii. The role of energy storage technologies", "iii. The growing use of wind power", "iv. The historical dependence on fossil fuels", "v. The advantages and growth of solar power", "vi. The challenges of relying on renewable energy", "vii. Government taxation on fossil fuels", "viii. Public opposition to wind farms"], correctAnswer: "iii. The growing use of wind power" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: ["i. International collaboration in renewable energy development", "ii. The role of energy storage technologies", "iii. The growing use of wind power", "iv. The historical dependence on fossil fuels", "v. The advantages and growth of solar power", "vi. The challenges of relying on renewable energy", "vii. Government taxation on fossil fuels", "viii. Public opposition to wind farms"], correctAnswer: "vi. The challenges of relying on renewable energy" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: ["i. International collaboration in renewable energy development", "ii. The role of energy storage technologies", "iii. The growing use of wind power", "iv. The historical dependence on fossil fuels", "v. The advantages and growth of solar power", "vi. The challenges of relying on renewable energy", "vii. Government taxation on fossil fuels", "viii. Public opposition to wind farms"], correctAnswer: "ii. The role of energy storage technologies" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: ["i. International collaboration in renewable energy development", "ii. The role of energy storage technologies", "iii. The growing use of wind power", "iv. The historical dependence on fossil fuels", "v. The advantages and growth of solar power", "vi. The challenges of relying on renewable energy", "vii. Government taxation on fossil fuels", "viii. Public opposition to wind farms"], correctAnswer: "i. International collaboration in renewable energy development" },
      // Group 2: True / False / Not Given (Q7–10)
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Fossil fuels have been the main source of energy for over a century.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The cost of solar power has remained the same in recent years.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most wind turbines are installed in mountainous regions.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Large-scale batteries help store excess electricity from renewable sources.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      // Group 3: Sentence Completion / Fill Blank (Q11–13) — summary with paraphrase
      { type: QuestionType.FILL_BLANK, prompt: "Summary — Q11: For many years, the world has relied heavily on coal, oil and gas, but rising concern over ___ change has driven a shift towards cleaner sources of energy.", correctAnswer: "climate" },
      { type: QuestionType.FILL_BLANK, prompt: "Summary — Q12: Solar panels and wind turbines now produce significant electricity, although output depends on the ___, which makes the supply less reliable at times.", correctAnswer: "weather" },
      { type: QuestionType.FILL_BLANK, prompt: "Summary — Q13: To overcome this issue, scientists are working on energy ___ systems, including large batteries that hold electricity until it is needed.", correctAnswer: "storage" },
    ],
  },
];
