import { CEFRLevel, QuestionType } from "@prisma/client";
import type { ReadingDataV2 } from "./reading-v2";

/**
 * Reading bank v3 — SLOT B set.
 *
 * 6 original IELTS Academic passages on technology, engineering, transport
 * and the digital world. Each passage has EXACTLY 2 question groups:
 *   Group 1: MCQ
 *   Group 2: FILL_BLANK (sentence completion)
 * Total 14-16 questions per passage.
 */
export const READING_V3_B: ReadingDataV2[] = [
  // =====================================================================
  {
    slot: "B",
    title: "The Long Road to the Suspension Bridge",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `A river or a deep gorge has always been an awkward obstacle for travellers. For most of recorded history the answer was a simple arch of stone or timber, a structure that worked well over short distances but became impossibly heavy if the span grew large. To cross a wide channel in a single leap, engineers needed a completely different principle — one in which the road hangs from above rather than rests on supports below.

A  The earliest suspension structures were modest footbridges, often little more than ropes of twisted plant fibre stretched between two banks. Such bridges were used for centuries in mountainous regions of Asia and South America, where carrying heavy stone across steep terrain was simply impractical. They swayed alarmingly and could carry only a single person at a time, but they proved that a deck could be supported by tension rather than compression.

B  The transformation into a serious form of engineering came with iron. In the early nineteenth century, builders began to replace fibre ropes with chains of wrought-iron links, and later with cables spun from thousands of thin steel wires. A wire cable, it turned out, was far stronger for its weight than any chain, because the load was shared evenly among the individual strands. This discovery allowed spans to grow from a few dozen metres to several hundred.

C  The essential idea of the modern suspension bridge is elegant. Two tall towers carry a pair of main cables, which sweep downward in a gentle curve and are anchored firmly into the ground or rock at each end. From these cables hang a series of vertical rods, and from the rods hangs the road deck itself. The towers bear the enormous downward force, while the anchorages resist the cables' pull. Nothing supports the centre of the deck from beneath.

D  This lightness, however, brought a new danger. A deck that hangs freely can be set swaying by a steady wind, and if the wind matches the bridge's natural rhythm the motion can grow until the structure tears itself apart. The collapse of the Tacoma Narrows Bridge in 1940, which twisted violently in a moderate breeze before breaking up, taught engineers that a suspension bridge must be designed for the air as carefully as for its load. Modern decks are shaped and stiffened so that wind flows past them smoothly.

E  Today the suspension bridge remains the only practical way to cross the very widest channels. The longest examples stretch for nearly two kilometres between their towers, carrying motorways and railways over straits that no other design could span. Yet the principle is unchanged from those swaying fibre footbridges: a roadway held up entirely by the pull of a cable, and a load carried not by pushing down but by hanging on.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "Why were stone arches unsuitable for crossing very wide channels?", options: ["They were too expensive to decorate", "They became impossibly heavy as the span grew", "They could not be built near rivers", "They required steel that was unavailable"], correctAnswer: "They became impossibly heavy as the span grew" },
      { type: QuestionType.MCQ, prompt: "What did the earliest fibre footbridges demonstrate?", options: ["That stone was the strongest building material", "That a deck could be supported by tension rather than compression", "That bridges were unnecessary in mountains", "That iron was easy to obtain"], correctAnswer: "That a deck could be supported by tension rather than compression" },
      { type: QuestionType.MCQ, prompt: "Why is a wire cable stronger for its weight than a chain?", options: ["The load is shared evenly among the individual strands", "It is made of a heavier metal", "It contains no joints at all", "It is always shorter than a chain"], correctAnswer: "The load is shared evenly among the individual strands" },
      { type: QuestionType.MCQ, prompt: "In a modern suspension bridge, what supports the centre of the road deck from beneath?", options: ["A row of stone pillars", "A floating pontoon", "Nothing supports it from beneath", "A second set of cables"], correctAnswer: "Nothing supports it from beneath" },
      { type: QuestionType.MCQ, prompt: "What lesson did the collapse of the Tacoma Narrows Bridge teach engineers?", options: ["That bridges should never carry railways", "That a bridge must be designed for the wind as well as its load", "That iron is stronger than steel", "That short spans are always safer"], correctAnswer: "That a bridge must be designed for the wind as well as its load" },
      { type: QuestionType.MCQ, prompt: "Which part of a suspension bridge resists the pull of the main cables?", options: ["The road deck", "The vertical rods", "The anchorages", "The wind"], correctAnswer: "The anchorages" },
      { type: QuestionType.MCQ, prompt: "What is the writer's main point in the final paragraph?", options: ["Suspension bridges are no longer being built", "The basic principle has remained the same since early footbridges", "Railways can never cross wide straits", "Stone arches have returned to favour"], correctAnswer: "The basic principle has remained the same since early footbridges" },
      { type: QuestionType.MCQ, prompt: "Where were early rope footbridges especially common?", options: ["In flat coastal plains", "In mountainous regions of Asia and South America", "In large industrial cities", "In desert trading routes"], correctAnswer: "In mountainous regions of Asia and South America" },
      // Group 2: FILL_BLANK
      { type: QuestionType.FILL_BLANK, prompt: "The earliest suspension structures were footbridges made from ropes of twisted plant ___.", correctAnswer: "fibre" },
      { type: QuestionType.FILL_BLANK, prompt: "In the early nineteenth century, builders replaced fibre ropes with chains of wrought-___ links.", correctAnswer: "iron" },
      { type: QuestionType.FILL_BLANK, prompt: "Modern main cables are spun from thousands of thin steel ___.", correctAnswer: "wires" },
      { type: QuestionType.FILL_BLANK, prompt: "In a suspension bridge the two tall ___ bear the enormous downward force.", correctAnswer: "towers" },
      { type: QuestionType.FILL_BLANK, prompt: "From the main cables hang a series of vertical ___, which in turn hold up the deck.", correctAnswer: "rods" },
      { type: QuestionType.FILL_BLANK, prompt: "The Tacoma Narrows Bridge collapsed in 1940 after twisting violently in a moderate ___.", correctAnswer: "breeze" },
      { type: QuestionType.FILL_BLANK, prompt: "The longest suspension bridges today stretch nearly two ___ between their towers.", correctAnswer: "kilometres" },
    ],
  },
  // =====================================================================
  {
    slot: "B",
    title: "The Rise of the Container Ship",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `It is easy to take cheap consumer goods for granted, yet the low price of a shirt, a laptop or a piece of furniture often owes less to the factory that made it than to the box it travelled in. The standardised steel shipping container, an object so plain that few people give it a second glance, has reshaped the global economy more profoundly than almost any invention of the past century.

A  Before the container, loading a cargo ship was a slow and chaotic affair. Goods arrived at the dock in barrels, sacks, crates and loose bundles, each of a different shape and weight. Teams of dockworkers stowed them by hand, fitting awkward items together like a vast jigsaw. A ship might spend longer in port being loaded and unloaded than it spent at sea, and theft and breakage were constant hazards along the way.

B  The decisive change came in the mid-1950s, when an American trucking businessman pursued a deceptively simple idea: pack goods into identical metal boxes on land, and lift those boxes directly onto the ship without ever opening them. The cargo would not be touched again until it reached its destination. The boxes could move seamlessly between truck, train and vessel, a quality that engineers called intermodal transport.

C  The real power of the container lay in standardisation. Once the world agreed on a small number of fixed sizes — most commonly the twenty-foot and forty-foot lengths — every crane, every truck bed and every ship's hold could be built to match. A container loaded in a factory in one country could be locked, sealed and tracked until it was opened in a warehouse on the far side of the planet. Handling costs, which had once made up a large share of a cargo's price, fell dramatically.

D  The consequences rippled far beyond the docks. Because shipping became so cheap and reliable, manufacturers no longer needed to locate factories close to their customers. A company could assemble a product wherever labour or materials were least expensive and ship it anywhere for a tiny fraction of its value. This freedom encouraged the long, complex supply chains that now stretch across continents, and it helped lift the volume of world trade many times over.

E  Not every effect has been welcome. Container ports require deep water and vast paved yards, so trade has concentrated in a handful of giant hubs while smaller, older ports have declined. The dockwork that once employed thousands has been replaced by automated cranes guided by computers. Critics also note that long supply chains, however efficient, are fragile: a single blocked canal or closed port can disrupt deliveries across the globe within days.

F  Even so, the steel box remains one of the quiet triumphs of modern engineering. It carries no engine and performs no clever calculation; its genius lies entirely in its sameness. By making the movement of goods predictable, measurable and almost frictionless, the humble container turned the oceans into a single, continuous conveyor belt for the world's commerce.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "According to the writer, the low price of many goods is largely due to", options: ["the skill of factory workers", "the box in which the goods travelled", "government subsidies", "improvements in advertising"], correctAnswer: "the box in which the goods travelled" },
      { type: QuestionType.MCQ, prompt: "What was a problem with loading ships before the container?", options: ["Ships were too small to hold cargo", "Goods of different shapes had to be stowed by hand", "There were no docks anywhere in the world", "Cargo could only be carried by train"], correctAnswer: "Goods of different shapes had to be stowed by hand" },
      { type: QuestionType.MCQ, prompt: "What was the key idea pursued by the American businessman in the 1950s?", options: ["Building much larger ships", "Packing goods into identical boxes and lifting them straight onto ships", "Replacing ships with aircraft", "Opening cargo for inspection at every port"], correctAnswer: "Packing goods into identical boxes and lifting them straight onto ships" },
      { type: QuestionType.MCQ, prompt: "Why was standardisation so important to the container's success?", options: ["It made the boxes lighter", "It allowed cranes, trucks and ships to be built to match", "It reduced the size of factories", "It made ships travel faster"], correctAnswer: "It allowed cranes, trucks and ships to be built to match" },
      { type: QuestionType.MCQ, prompt: "How did cheap shipping affect where factories were located?", options: ["Factories had to stay close to customers", "Factories could be placed wherever labour or materials were cheapest", "Factories all moved to port cities", "Factories disappeared completely"], correctAnswer: "Factories could be placed wherever labour or materials were cheapest" },
      { type: QuestionType.MCQ, prompt: "Which of the following is mentioned as a drawback of containerisation?", options: ["Goods are damaged more often than before", "Trade has concentrated in a few giant hubs", "Ships have become slower", "Containers cannot be tracked"], correctAnswer: "Trade has concentrated in a few giant hubs" },
      { type: QuestionType.MCQ, prompt: "Why does the writer say long supply chains are fragile?", options: ["Containers rust quickly at sea", "A single blocked canal can disrupt deliveries worldwide", "Workers refuse to use automated cranes", "Ports run out of fuel easily"], correctAnswer: "A single blocked canal can disrupt deliveries worldwide" },
      { type: QuestionType.MCQ, prompt: "What does the writer say the container's genius lies in?", options: ["Its powerful engine", "Its ability to perform calculations", "Its sameness", "Its decorative design"], correctAnswer: "Its sameness" },
      // Group 2: FILL_BLANK
      { type: QuestionType.FILL_BLANK, prompt: "Before the container, a ship might spend longer in ___ being loaded than it spent at sea.", correctAnswer: "port" },
      { type: QuestionType.FILL_BLANK, prompt: "The decisive change came in the mid-1950s, when an American ___ businessman pursued a simple idea.", correctAnswer: "trucking" },
      { type: QuestionType.FILL_BLANK, prompt: "The ability of containers to move between truck, train and vessel is called ___ transport.", correctAnswer: "intermodal" },
      { type: QuestionType.FILL_BLANK, prompt: "The two most common container lengths are the twenty-foot and the ___ lengths.", correctAnswer: "forty-foot" },
      { type: QuestionType.FILL_BLANK, prompt: "Cheap shipping encouraged the long, complex supply ___ that now cross continents.", correctAnswer: "chains" },
      { type: QuestionType.FILL_BLANK, prompt: "On modern docks, manual dockwork has been replaced by automated ___ guided by computers.", correctAnswer: "cranes" },
      { type: QuestionType.FILL_BLANK, prompt: "The writer compares the oceans to a single, continuous conveyor ___ for world commerce.", correctAnswer: "belt" },
    ],
  },
  // =====================================================================
  {
    slot: "B",
    title: "How the Lithium-Ion Battery Changed the World",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `When a portable device runs out of power, it is tempting to blame the battery. Yet the rechargeable battery inside a modern phone is one of the most refined products ever manufactured, and its arrival made possible a long list of technologies that earlier generations could only imagine. The story of the lithium-ion cell is, in many ways, the story of the digital age itself.

A  A battery stores energy in chemical form and releases it as electricity on demand. For most of the twentieth century, the dominant rechargeable types were based on lead or on nickel. They worked, but they were heavy, and they held only a modest amount of energy for their weight. A laptop powered by such cells would have been too bulky to carry comfortably, and a practical electric car was out of the question.

B  Lithium is attractive to chemists because it is the lightest of all metals and gives up its electrons readily. A battery built around it can therefore store a great deal of energy in a small, light package. The difficulty was that pure lithium metal is dangerously reactive. The breakthrough, achieved through the work of several researchers in the 1970s and 1980s, was to keep the lithium in the form of ions that shuttle back and forth between two electrodes rather than as a raw metal.

C  Inside the cell, charging pushes lithium ions out of one electrode and into the other; discharging lets them flow back, releasing energy along the way. Because no metal is destroyed or created in the process, the cell can be cycled hundreds of times before it noticeably weakens. This combination of light weight, high capacity and long life is what set the lithium-ion battery apart from everything that came before it.

D  The commercial impact was swift. Once the technology became reliable in the early 1990s, it spread first into camcorders and laptops, then into mobile phones, and eventually into power tools and electric vehicles. Each new application drove production higher, and as factories scaled up, the price per unit of stored energy fell steeply — by roughly ninety per cent over three decades. Few manufactured products have ever become cheaper so quickly.

E  That falling price now matters far beyond personal gadgets. Large banks of lithium-ion cells are increasingly used to store electricity from solar panels and wind turbines, smoothing out the gap between when renewable power is generated and when it is needed. In this role the battery is no longer a convenience but a piece of essential infrastructure, helping electricity grids cope with sources that switch on and off with the weather.

F  The technology is not without limits. The metals required, including lithium itself and cobalt, are mined in only a few regions, raising concerns about supply and about the conditions under which they are extracted. Cells also degrade with age and can catch fire if damaged. Researchers are therefore pursuing alternatives — among them solid-state designs and batteries based on more abundant elements. For the present, however, the lithium-ion cell remains the quiet engine of modern portable life.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "What does the writer say about the rechargeable battery in a modern phone?", options: ["It is the cheapest part of the device", "It is one of the most refined products ever manufactured", "It has barely changed in a century", "It is no longer necessary"], correctAnswer: "It is one of the most refined products ever manufactured" },
      { type: QuestionType.MCQ, prompt: "What was the main drawback of lead and nickel rechargeable batteries?", options: ["They could not be recharged at all", "They were heavy and held little energy for their weight", "They were extremely expensive to produce", "They worked only in cold climates"], correctAnswer: "They were heavy and held little energy for their weight" },
      { type: QuestionType.MCQ, prompt: "Why is lithium attractive to battery chemists?", options: ["It is the most common metal on Earth", "It is the lightest metal and gives up electrons readily", "It never reacts with anything", "It is cheap to mine everywhere"], correctAnswer: "It is the lightest metal and gives up electrons readily" },
      { type: QuestionType.MCQ, prompt: "What was the key breakthrough that made lithium batteries safe to use?", options: ["Coating the metal in glass", "Keeping the lithium as ions that move between two electrodes", "Cooling the battery with water", "Removing the lithium entirely"], correctAnswer: "Keeping the lithium as ions that move between two electrodes" },
      { type: QuestionType.MCQ, prompt: "Why can a lithium-ion cell be recharged hundreds of times?", options: ["It is sealed against air", "No metal is destroyed or created during the process", "It is replaced after every use", "It generates its own fuel"], correctAnswer: "No metal is destroyed or created during the process" },
      { type: QuestionType.MCQ, prompt: "What happened to the price of lithium-ion batteries over three decades?", options: ["It rose sharply", "It stayed roughly the same", "It fell by roughly ninety per cent", "It doubled every year"], correctAnswer: "It fell by roughly ninety per cent" },
      { type: QuestionType.MCQ, prompt: "How are large banks of lithium-ion cells now used in electricity grids?", options: ["To generate power directly from coal", "To store power from solar panels and wind turbines", "To replace power stations entirely", "To cool the wires of the grid"], correctAnswer: "To store power from solar panels and wind turbines" },
      { type: QuestionType.MCQ, prompt: "Which of the following is mentioned as a limitation of lithium-ion technology?", options: ["The cells cannot be recharged", "The required metals are mined in only a few regions", "The batteries are too light to be useful", "The cells produce no energy at all"], correctAnswer: "The required metals are mined in only a few regions" },
      // Group 2: FILL_BLANK
      { type: QuestionType.FILL_BLANK, prompt: "A battery stores energy in chemical form and releases it as ___ on demand.", correctAnswer: "electricity" },
      { type: QuestionType.FILL_BLANK, prompt: "In its raw form, pure lithium metal is dangerously ___.", correctAnswer: "reactive" },
      { type: QuestionType.FILL_BLANK, prompt: "During charging, lithium ions are pushed out of one electrode and into the ___.", correctAnswer: "other" },
      { type: QuestionType.FILL_BLANK, prompt: "The lithium-ion battery first spread into camcorders and ___ in the early 1990s.", correctAnswer: "laptops" },
      { type: QuestionType.FILL_BLANK, prompt: "Battery banks help smooth the gap between when renewable power is generated and when it is ___.", correctAnswer: "needed" },
      { type: QuestionType.FILL_BLANK, prompt: "Besides lithium, the metal ___ used in many cells is mined in only a few regions.", correctAnswer: "cobalt" },
      { type: QuestionType.FILL_BLANK, prompt: "Among the alternatives being researched are ___-state designs and batteries using more abundant elements.", correctAnswer: "solid" },
    ],
  },
  // =====================================================================
  {
    slot: "B",
    title: "The Quiet Spread of GPS",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Few inventions have moved so quickly from the secret to the ordinary. A satellite navigation system that began as a tool for the military is now embedded in almost every smartphone, car and delivery van. Most people use it many times a day without a thought, yet the technology behind it is a remarkable feat of physics and engineering — and it is far more fragile than its users realise.

A  The principle of the Global Positioning System, or GPS, rests on a fleet of satellites that circle the Earth at a height of around twenty thousand kilometres. Each satellite carries an extremely accurate clock and continuously broadcasts a signal stating exactly what time it is and where the satellite is. A receiver on the ground listens for these signals and works out how long each one took to arrive. Because radio waves travel at a known speed, that tiny delay reveals the distance to each satellite.

B  A single distance is not enough to fix a position. With the distance to one satellite known, the receiver could be anywhere on a vast sphere around it. Signals from a second and third satellite narrow the possibilities down, and a fourth allows the receiver to correct its own clock and pin the location precisely. In practice a modern receiver listens to far more than four satellites at once, which improves both accuracy and reliability.

C  The system depends on measuring time with astonishing precision. Light travels about thirty centimetres in a billionth of a second, so a clock error of even a few billionths of a second would place a user metres away from their true position. To make matters harder, the satellite clocks tick at a very slightly different rate from clocks on the ground, an effect predicted by Einstein's theories. Engineers must correct for this difference, or the whole system would drift badly within a day.

D  GPS was designed for navigation, but its hidden role as a source of precise time has become just as important. Banks use the timing signal to stamp financial transactions in the correct order. Electricity grids and mobile phone networks rely on it to keep their equipment synchronised. In this sense, much of the modern economy quietly depends on signals beamed down from space.

E  This dependence is also a weakness. The signal that reaches the ground is extraordinarily faint, and it can be blocked by tall buildings, disrupted by solar storms, or deliberately jammed by a cheap and illegal device. Because so many systems trust GPS without a backup, a long interruption could cause problems far beyond a driver missing a turn. For this reason, some countries are now building ground-based timing networks to serve as a safety net should the satellites ever fall silent.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "What does the writer say GPS originally was?", options: ["A toy for children", "A tool for the military", "A weather-forecasting service", "A telephone network"], correctAnswer: "A tool for the military" },
      { type: QuestionType.MCQ, prompt: "How does a GPS receiver work out the distance to a satellite?", options: ["By measuring the brightness of the signal", "By measuring how long the signal took to arrive", "By counting the number of satellites overhead", "By reading the satellite's temperature"], correctAnswer: "By measuring how long the signal took to arrive" },
      { type: QuestionType.MCQ, prompt: "Why is the distance to a single satellite not enough to fix a position?", options: ["The satellite moves too fast", "The receiver could be anywhere on a vast sphere around it", "The signal is too weak to read", "Satellites do not carry clocks"], correctAnswer: "The receiver could be anywhere on a vast sphere around it" },
      { type: QuestionType.MCQ, prompt: "What does a fourth satellite signal allow a receiver to do?", options: ["Increase its broadcasting power", "Correct its own clock and pin the location precisely", "Switch off the other satellites", "Measure the speed of light"], correctAnswer: "Correct its own clock and pin the location precisely" },
      { type: QuestionType.MCQ, prompt: "Why must engineers correct for a difference between satellite and ground clocks?", options: ["Otherwise the satellites would fall to Earth", "Otherwise the whole system would drift badly within a day", "Otherwise the signal would become too loud", "Otherwise the receivers would overheat"], correctAnswer: "Otherwise the whole system would drift badly within a day" },
      { type: QuestionType.MCQ, prompt: "According to the passage, why do banks rely on the GPS timing signal?", options: ["To locate their customers", "To stamp financial transactions in the correct order", "To power their computers", "To advertise their services"], correctAnswer: "To stamp financial transactions in the correct order" },
      { type: QuestionType.MCQ, prompt: "Which of the following is mentioned as a way the GPS signal can be disrupted?", options: ["Heavy rainfall", "Deliberate jamming by a cheap device", "Loud noise on the ground", "Too many receivers in one place"], correctAnswer: "Deliberate jamming by a cheap device" },
      { type: QuestionType.MCQ, prompt: "Why are some countries building ground-based timing networks?", options: ["To replace mobile phones", "To serve as a safety net if the satellites fall silent", "To make GPS signals stronger", "To launch new satellites"], correctAnswer: "To serve as a safety net if the satellites fall silent" },
      // Group 2: FILL_BLANK
      { type: QuestionType.FILL_BLANK, prompt: "GPS satellites circle the Earth at a height of around twenty thousand ___.", correctAnswer: "kilometres" },
      { type: QuestionType.FILL_BLANK, prompt: "Each satellite carries an extremely accurate ___ and broadcasts the current time.", correctAnswer: "clock" },
      { type: QuestionType.FILL_BLANK, prompt: "Because radio waves travel at a known speed, a tiny ___ in the signal reveals the distance to a satellite.", correctAnswer: "delay" },
      { type: QuestionType.FILL_BLANK, prompt: "The slightly different rate of satellite clocks was predicted by ___ theories.", correctAnswer: "Einstein's" },
      { type: QuestionType.FILL_BLANK, prompt: "Electricity grids and mobile phone networks use the GPS signal to keep their equipment ___.", correctAnswer: "synchronised" },
      { type: QuestionType.FILL_BLANK, prompt: "The GPS signal reaching the ground is extraordinarily ___, and can easily be blocked.", correctAnswer: "faint" },
      { type: QuestionType.FILL_BLANK, prompt: "The signal can also be disrupted by ___ storms from the sun.", correctAnswer: "solar" },
    ],
  },
  // =====================================================================
  {
    slot: "B",
    title: "The Surprising History of the Bicycle",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `The bicycle is often treated as a minor invention, overshadowed by the steam engine, the motor car and the aircraft. Yet for a machine made largely of metal tubes and two wheels, it has had an extraordinary influence on how people move, where they live and even how societies have changed. Its development was also far less straightforward than most people assume.

A  The earliest ancestor of the bicycle, built in Germany in 1817, had no pedals at all. The rider sat on a wooden frame between two wheels and pushed along the ground with their feet, steering with a simple handlebar. It was little more than a curiosity, awkward on rough roads and exhausting to use, but it introduced one crucial idea: that a person could balance on two wheels while moving forward.

B  Pedals appeared several decades later, attached directly to the front wheel. To make each turn of the pedals carry the rider further, manufacturers simply made the front wheel larger and larger, producing the famous "high-wheeler" with its enormous front tyre. The design worked, but it was dangerous: the rider sat far above the ground, and the smallest obstacle could throw them forward over the handlebars.

C  The machine that we would recognise today emerged in the 1880s and was known as the "safety bicycle". Its two wheels were of equal, modest size, and the pedals drove the rear wheel through a chain. By choosing the sizes of the two toothed wheels that the chain connected, designers could make the bicycle travel a long way for each turn of the pedals without raising the rider dangerously high. The addition of air-filled rubber tyres soon afterwards made the ride far smoother.

D  The social effects of this practical machine were considerable. The bicycle was far cheaper than a horse and needed no stable or feed. For the first time, ordinary workers could live some distance from their workplace, and young people could travel beyond their own village without permission or expense. Historians have noted in particular how the bicycle widened the independence of women, who could now move freely without a chaperone or a carriage.

E  Although the motor car later pushed the bicycle to the margins in many wealthy countries, the machine never disappeared, and in recent years it has returned to favour. Crowded cities struggling with traffic and air pollution have begun building protected lanes, and the addition of a small electric motor has made cycling practical for longer distances and hillier routes. A device dismissed for a century as old-fashioned is once again being treated as part of the future of transport.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "What does the writer say about the bicycle's influence?", options: ["It has had almost no effect on society", "It has had an extraordinary influence despite its simplicity", "It was more important than all other inventions", "It only mattered in Germany"], correctAnswer: "It has had an extraordinary influence despite its simplicity" },
      { type: QuestionType.MCQ, prompt: "How did the rider of the 1817 machine move forward?", options: ["By turning pedals on the front wheel", "By pushing along the ground with their feet", "By using a small steam engine", "By being pulled by a horse"], correctAnswer: "By pushing along the ground with their feet" },
      { type: QuestionType.MCQ, prompt: "What crucial idea did the earliest machine introduce?", options: ["That wheels should be made of rubber", "That a person could balance on two wheels while moving", "That pedals were unnecessary", "That roads should be paved"], correctAnswer: "That a person could balance on two wheels while moving" },
      { type: QuestionType.MCQ, prompt: "Why did manufacturers make the front wheel of the high-wheeler so large?", options: ["To make the bicycle lighter", "To carry the rider further with each turn of the pedals", "To make the machine cheaper", "To improve the rider's view"], correctAnswer: "To carry the rider further with each turn of the pedals" },
      { type: QuestionType.MCQ, prompt: "Why was the high-wheeler considered dangerous?", options: ["Its tyres caught fire easily", "The rider could be thrown forward over the handlebars", "It was too heavy to steer", "It moved far too slowly"], correctAnswer: "The rider could be thrown forward over the handlebars" },
      { type: QuestionType.MCQ, prompt: "What made the 'safety bicycle' safer than the high-wheeler?", options: ["It had no pedals", "Its two wheels were of equal, modest size", "It was driven by a steam engine", "It had only one wheel"], correctAnswer: "Its two wheels were of equal, modest size" },
      { type: QuestionType.MCQ, prompt: "According to the passage, why was the bicycle cheaper than keeping a horse?", options: ["It could be ridden by children", "It needed no stable or feed", "It was made of wood", "It travelled more slowly"], correctAnswer: "It needed no stable or feed" },
      { type: QuestionType.MCQ, prompt: "Why has the bicycle returned to favour in recent years?", options: ["Cars have been banned everywhere", "Cities struggling with traffic and pollution are building protected lanes", "Horses have become too expensive", "The motor car was never invented"], correctAnswer: "Cities struggling with traffic and pollution are building protected lanes" },
      // Group 2: FILL_BLANK
      { type: QuestionType.FILL_BLANK, prompt: "The earliest ancestor of the bicycle was built in Germany in ___.", correctAnswer: "1817" },
      { type: QuestionType.FILL_BLANK, prompt: "The rider of the first machine steered using a simple ___.", correctAnswer: "handlebar" },
      { type: QuestionType.FILL_BLANK, prompt: "On the high-wheeler, the pedals were attached directly to the front ___.", correctAnswer: "wheel" },
      { type: QuestionType.FILL_BLANK, prompt: "On the safety bicycle, the pedals drove the rear wheel through a ___.", correctAnswer: "chain" },
      { type: QuestionType.FILL_BLANK, prompt: "The addition of air-filled rubber ___ soon made the ride far smoother.", correctAnswer: "tyres" },
      { type: QuestionType.FILL_BLANK, prompt: "Historians note that the bicycle widened the independence of ___, who could move freely without a chaperone.", correctAnswer: "women" },
      { type: QuestionType.FILL_BLANK, prompt: "Adding a small electric ___ has made cycling practical for longer and hillier routes.", correctAnswer: "motor" },
    ],
  },
  // =====================================================================
  {
    slot: "B",
    title: "Cleaning Up Space Junk",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `When people picture outer space, they tend to imagine emptiness. The region just above the atmosphere, however, is becoming surprisingly crowded. Decades of rocket launches have left the orbits closest to Earth littered with debris, and a growing number of engineers now argue that cleaning up this mess is one of the more urgent challenges of the coming decades.

A  Space debris is anything in orbit that no longer serves a purpose. The category includes satellites that have stopped working, the spent upper stages of rockets, and a vast cloud of smaller fragments — flecks of paint, bolts, and pieces shed by older missions. Tracking networks on the ground follow tens of thousands of objects larger than a tennis ball, but the smaller pieces, far too numerous to catalogue, are thought to number in the millions.

B  The danger lies in speed rather than size. An object in low orbit travels at roughly eight kilometres every second, and a collision at that velocity carries enormous energy. A fragment no larger than a marble can strike with the force of a small explosion, and even a fleck of paint can pit the window of a spacecraft. Because debris and working satellites share the same crowded region, every fresh piece raises the risk to everything else.

C  The most worrying scenario is a chain reaction. If two large objects collide, they do not simply stop; they shatter into thousands of new fragments, each capable of causing further collisions. In theory this process could feed on itself until certain orbits became too hazardous to use at all. The idea, first described by a NASA scientist in the 1970s, is known as the Kessler syndrome, and it would be difficult to reverse once it began.

D  Preventing new debris is therefore the first priority. Modern guidelines ask operators to move retired satellites either down into the atmosphere, where they burn up, or out to a distant "graveyard" orbit. Newer spacecraft are increasingly designed to remove themselves at the end of their working life, sometimes by trailing a thin sail that catches the faint traces of atmosphere and slowly drags the craft downward.

E  Removing what is already there is far harder. Debris cannot simply be grabbed, because a tumbling object is awkward and dangerous to approach. Experimental missions have tested nets, harpoons and robotic arms, each designed to capture a large piece of junk and steer it toward a fiery re-entry. None of these methods is yet cheap or routine, and a difficult question remains unanswered: under current treaties, no nation may touch another's defunct satellite without permission.

F  For now, the most realistic strategy combines careful design, international cooperation and steady removal of the largest objects. The orbits around Earth are a shared resource, much like a fishing ground or a forest, and they can be spoiled by neglect. Keeping them usable will require the same patient management that any other common resource demands.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "What does the writer say about the region just above the atmosphere?", options: ["It is completely empty", "It is becoming surprisingly crowded", "It is too far away to study", "It contains no satellites"], correctAnswer: "It is becoming surprisingly crowded" },
      { type: QuestionType.MCQ, prompt: "How is space debris defined in the passage?", options: ["Any object launched in the last year", "Anything in orbit that no longer serves a purpose", "Only large broken satellites", "Natural rocks captured by Earth"], correctAnswer: "Anything in orbit that no longer serves a purpose" },
      { type: QuestionType.MCQ, prompt: "According to the writer, where does the danger of space debris mainly lie?", options: ["In its size", "In its colour", "In its speed", "In its temperature"], correctAnswer: "In its speed" },
      { type: QuestionType.MCQ, prompt: "What can even a fleck of paint do to a spacecraft?", options: ["Destroy it completely", "Pit its window", "Change its orbit", "Slow it down"], correctAnswer: "Pit its window" },
      { type: QuestionType.MCQ, prompt: "What is the Kessler syndrome?", options: ["A method of cleaning up debris", "A chain reaction in which collisions create ever more fragments", "A type of satellite engine", "A treaty between nations"], correctAnswer: "A chain reaction in which collisions create ever more fragments" },
      { type: QuestionType.MCQ, prompt: "How are some newer spacecraft designed to remove themselves at the end of their life?", options: ["By exploding in orbit", "By trailing a thin sail that drags them downward", "By flying away from Earth forever", "By splitting into smaller satellites"], correctAnswer: "By trailing a thin sail that drags them downward" },
      { type: QuestionType.MCQ, prompt: "Why is removing existing debris so difficult?", options: ["Debris is invisible to all instruments", "A tumbling object is awkward and dangerous to approach", "Debris moves too slowly to catch", "There is no debris left to remove"], correctAnswer: "A tumbling object is awkward and dangerous to approach" },
      { type: QuestionType.MCQ, prompt: "What legal problem does the writer mention about debris removal?", options: ["Removing debris is forbidden everywhere", "No nation may touch another's defunct satellite without permission", "Only one country owns all the satellites", "Debris removal must happen at night"], correctAnswer: "No nation may touch another's defunct satellite without permission" },
      // Group 2: FILL_BLANK
      { type: QuestionType.FILL_BLANK, prompt: "Ground tracking networks follow tens of thousands of objects larger than a tennis ___.", correctAnswer: "ball" },
      { type: QuestionType.FILL_BLANK, prompt: "An object in low orbit travels at roughly eight ___ every second.", correctAnswer: "kilometres" },
      { type: QuestionType.FILL_BLANK, prompt: "The Kessler syndrome was first described by a NASA ___ in the 1970s.", correctAnswer: "scientist" },
      { type: QuestionType.FILL_BLANK, prompt: "Retired satellites can be moved out to a distant ___ orbit.", correctAnswer: "graveyard" },
      { type: QuestionType.FILL_BLANK, prompt: "Experimental missions have tested nets, ___ and robotic arms to capture junk.", correctAnswer: "harpoons" },
      { type: QuestionType.FILL_BLANK, prompt: "Captured debris is steered toward a fiery ___ in the atmosphere.", correctAnswer: "re-entry" },
      { type: QuestionType.FILL_BLANK, prompt: "The writer compares Earth's orbits to a shared resource such as a fishing ground or a ___.", correctAnswer: "forest" },
    ],
  },
];
