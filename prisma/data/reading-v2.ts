import { CEFRLevel, QuestionType } from "@prisma/client";
import type { ReadingData } from "./reading";

/**
 * Reading bank v2 — paragraph-labeled IELTS-style passages, each with EXACTLY 2 question groups.
 *
 * 4 slots × 3 passages = 12 passages. Each passage has two consecutive question
 * groups, each a single question type drawn from two different categories
 * (Truth Verification / Completion / Matching / Selection). Total 14-16 questions.
 *
 *   Slot A: MATCHING_HEADINGS (paragraphs A–F) + TRUE_FALSE_NOT_GIVEN
 *   Slot B: MCQ + FILL_BLANK (sentence completion)
 *   Slot C: MATCHING_INFO (which paragraph contains...) + FILL_BLANK
 *   Slot D: MCQ + TRUE_FALSE_NOT_GIVEN
 */
export type ReadingDataV2 = ReadingData & { slot: "A" | "B" | "C" | "D" };

// Shared options for Matching Headings (reused inside each passage)
const A1_HEADINGS = [
  "i. A surprising return to an old format",
  "ii. The decline of streaming services",
  "iii. How collectors drive the market",
  "iv. Vinyl in dance music venues",
  "v. Manufacturing challenges of the comeback",
  "vi. The role of younger listeners",
  "vii. Why audio quality is debated",
  "viii. The closure of independent stores",
  "ix. The economics behind a single album",
];

const A2_HEADINGS = [
  "i. The dangers of underground water loss",
  "ii. A worldwide scientific consensus",
  "iii. Reducing heat from above",
  "iv. Cities that have already adapted",
  "v. The growing burden on hospitals",
  "vi. Why concrete cities trap heat",
  "vii. Plans drawn up but rarely funded",
  "viii. Trees as practical cooling tools",
  "ix. The role of personal behaviour",
];

const A3_HEADINGS = [
  "i. The brain's overnight cleaning routine",
  "ii. Sleep across different cultures",
  "iii. The two main types of sleep",
  "iv. Consequences of repeated short nights",
  "v. Why teenagers go to bed late",
  "vi. The body's internal clock",
  "vii. Drugs and devices for better sleep",
  "viii. A function still under debate",
  "ix. How memories are stored at night",
];

export const READING_TESTS_V2: ReadingDataV2[] = [
  // =====================================================================
  // SLOT A — Matching Headings + True/False/Not Given
  // =====================================================================
  {
    slot: "A",
    title: "The Resurgence of Vinyl Records",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Vinyl records, the rotating black discs that once dominated the music industry, were widely declared dead by the late 1990s. Cassettes had already replaced them in cars and bedrooms, and the rise of the compact disc — followed soon after by digital downloads and streaming — appeared to seal their fate. Yet today the format is enjoying its most successful decade in over forty years.

A  Industry figures tell an unmistakable story. In 2007, fewer than one million new vinyl LPs were sold in the United Kingdom. By 2022 that figure had climbed beyond five million, with annual sales now exceeding those of CDs for the first time since 1987. Similar growth has been reported in the United States, Germany and Japan. The numbers are modest compared with the billions of streams played each week, yet they reflect a steady, decade-long climb that has caught major record labels by surprise.

B  Much of the rise has been driven by listeners who are too young to remember when vinyl was the only option. Surveys conducted in record stores suggest that almost half of new vinyl purchasers are under thirty. For these buyers, a record is less a way of hearing music — most stream the same album on their phones — and more a physical object to be displayed, gifted or collected. Album artwork, gatefold sleeves and coloured pressings carry a value that an invisible file cannot.

C  Pressing plants, however, have struggled to keep up with the renewed demand. Many of the world's vinyl factories closed during the 1990s, and only a handful of presses were left running into the new century. The few that survived now operate around the clock, while new plants take years to build because the specialised machinery is no longer mass-produced. Major artists routinely wait six months between finishing an album and receiving copies on vinyl, a delay almost unheard of in any other consumer market.

D  This bottleneck explains why a typical new release on vinyl costs three or four times as much as the same album streamed for a month. Materials, mastering and royalties account for only part of the price. The bulk reflects the cost of running aging equipment, shipping heavy discs and printing the elaborate sleeves that buyers expect. Critics worry that high prices may eventually drive young listeners away, although for now demand has continued to grow despite each round of price rises.

E  Whether vinyl will keep its momentum is harder to predict. Some industry analysts believe the format will plateau as soon as the novelty fades, while others point to the long history of audio formats that refused to disappear — radio, FM broadcasting, even live concerts — as evidence that physical music has a permanent niche. For now, the warehouses are full, the pressing plants are busy, and a generation that grew up streaming has become unexpectedly fond of an object that turns at 33⅓ revolutions per minute.`,
    questions: [
      // Group 1: Matching Headings (paragraphs A–E)
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: A1_HEADINGS, correctAnswer: "i. A surprising return to an old format" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: A1_HEADINGS, correctAnswer: "vi. The role of younger listeners" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: A1_HEADINGS, correctAnswer: "v. Manufacturing challenges of the comeback" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: A1_HEADINGS, correctAnswer: "ix. The economics behind a single album" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: A1_HEADINGS, correctAnswer: "iii. How collectors drive the market" },
      // Group 2: True / False / Not Given (10 statements)
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "UK vinyl sales in 2022 were more than five times higher than in 2007.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Vinyl sales now exceed sales of digital streaming worldwide.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most young vinyl buyers also listen to the same albums online.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Asian markets account for the largest share of vinyl growth.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The specialised machinery for vinyl pressing is still being mass-produced.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Rising vinyl prices have already reduced demand from young listeners.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "All analysts agree that vinyl sales will continue to rise.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Vinyl sales in the UK were higher than CD sales in 2022 for the first time since 1987.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Major artists may wait around six months to receive vinyl copies of a finished album.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Record labels had accurately predicted the return of vinyl.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
    ],
  },
  {
    slot: "A",
    title: "How Cities Survive Heatwaves",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Across every continent except Antarctica, cities now experience hotter summers than they did fifty years ago. Some of the increase is the direct consequence of global warming, but a significant share is due to the way urban areas themselves alter the climate. Understanding this difference is at the heart of efforts to keep cities liveable in a warming world.

A  Dark roofs, asphalt streets and dense concrete walls all behave in the same way: they absorb sunlight during the day and release it slowly through the night. The result is what scientists call the "urban heat island" effect, in which the centre of a large city can be five or even ten degrees Celsius warmer than the surrounding countryside. The temperature gap is sharpest in the early hours of the morning, when rural areas have cooled and city air remains close to the previous afternoon's peak.

B  Heatwaves intensified by this effect are no longer an inconvenience but a public-health emergency. During the European summer of 2022, more than 60,000 excess deaths were attributed to extreme heat, the majority in dense urban districts. Hospitals report sharp rises in admissions during heat events, particularly among the elderly, the homeless, and those whose homes lack any form of cooling. In some Spanish and Italian cities, ambulance services now activate "hot weather protocols" weeks in advance of the season.

C  The cheapest and most immediate measure is to make rooftops reflective rather than absorbent. A coat of bright-white paint can reduce a roof's surface temperature by more than thirty degrees, lowering the heat that flows into the rooms below. Several US cities, including New York and Los Angeles, now require white or reflective roofs on most new buildings. The savings on air conditioning have been measured in hundreds of dollars per household per summer.

D  More ambitious approaches focus on green cover. A single mature tree provides shade equivalent to several large air-conditioning units, and a row of trees along a residential street can reduce ambient temperature by two to three degrees. Cities such as Melbourne, Medellín and Singapore have launched large-scale tree-planting programmes, often combined with so-called "green corridors" that connect parks, riversides and shaded walkways. The results are encouraging, though planting and watering trees in a hot climate is itself expensive.

E  In hotter, drier regions, designers are returning to older techniques. Spanish and Moroccan cities have begun to revive whitewashed walls, narrow shaded alleys and the careful orientation of windows away from the afternoon sun — methods that pre-date air conditioning by centuries. Some researchers argue that this traditional knowledge, dismissed as outdated for decades, may matter more than any single piece of modern technology.

F  None of these measures, however, can substitute for reducing the underlying cause. Each degree of additional global warming is expected to make heatwaves both more frequent and more severe. Adapting cities will buy time and save lives, but unless emissions continue to fall, even the most carefully designed urban environments will eventually be tested beyond their limits.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: A2_HEADINGS, correctAnswer: "vi. Why concrete cities trap heat" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: A2_HEADINGS, correctAnswer: "v. The growing burden on hospitals" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: A2_HEADINGS, correctAnswer: "iii. Reducing heat from above" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: A2_HEADINGS, correctAnswer: "viii. Trees as practical cooling tools" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: A2_HEADINGS, correctAnswer: "iv. Cities that have already adapted" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: A2_HEADINGS, correctAnswer: "ii. A worldwide scientific consensus" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "City centres can be over five degrees warmer than nearby rural areas.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Excess deaths during the 2022 European heatwave were higher in rural areas than in cities.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "New York requires white roofs on every existing building.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Trees in residential streets can lower local temperature by several degrees.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Asian cities have planted more trees than European cities.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Traditional building techniques have generally been preserved without interruption in Spain and Morocco.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Adaptation alone will be enough to protect cities if temperatures keep rising.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The urban heat island effect is most pronounced in the early morning.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Reflective roofs are described as the most affordable cooling measure.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Some ambulance services begin heat-related preparations before the hot season starts.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
    ],
  },
  {
    slot: "A",
    title: "The Science of Sleep Cycles",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `For most of human history, sleep was simply something that happened — a nightly retreat from the world, the function of which was rarely questioned. Only in the last seventy years have scientists begun to record what the brain actually does between dusk and dawn, and the answers continue to surprise even specialists in the field.

A  Modern sleep research dates to a single discovery made in 1953, when graduate students at the University of Chicago noticed that volunteers showed bursts of rapid eye movement at regular intervals during the night. Following this thread led to the recognition of two distinct kinds of sleep, now known as REM and non-REM. The two alternate in cycles lasting about ninety minutes, and a typical adult passes through four or five full cycles before waking.

B  Roughly three-quarters of the night is spent in non-REM sleep, divided into progressively deeper stages. During the deepest stage, the brain produces long, slow waves and the body releases growth hormone, which repairs muscle and tissue. Children spend more time in this stage than adults — one reason why a tired child can sleep through almost any noise. By contrast, REM sleep is shorter, more chaotic, and the period in which vivid dreams occur; the brain in REM looks, to monitoring equipment, almost as active as during waking hours.

C  An internal clock, often called the circadian rhythm, governs when each of these stages takes place. The clock is calibrated daily by exposure to light, which is why a stay in a windowless room or a long flight across time zones can throw it out of step. The circadian rhythm also explains a long-standing puzzle of adolescence: most teenagers feel naturally alert until midnight and unable to wake before mid-morning, a shift driven by hormonal changes rather than laziness.

D  Sleep loss carries costs that researchers are still measuring. After only one night of poor sleep, reaction times slow, mood becomes more unstable, and the immune system shows reduced activity. Chronic restriction — fewer than six hours a night, repeated for weeks — has been linked to obesity, diabetes and an increased risk of cardiovascular disease. Some recent studies suggest that long-term sleep deprivation may also contribute to dementia, although the underlying mechanism is not yet confirmed.

E  Why an animal as vulnerable as a sleeping human should spend a third of its life unconscious has been debated for over a century. The most widely accepted theory today is that sleep is a kind of housekeeping, allowing the brain to flush waste products through a network of channels that open during deep sleep and close again on waking. A second view, not necessarily contradictory, is that sleep consolidates memories: experiences from the day appear to be replayed in compressed form, strengthening connections that matter and discarding ones that do not.

F  Whatever its purpose, sleep has clearly resisted every attempt to abolish it. Stimulants such as caffeine merely postpone the need; deep sleep can be shortened but not skipped without consequence. As one researcher has put it, sleep may be the single biological function that medicine has, after a hundred years of study, almost completely failed to improve.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: A3_HEADINGS, correctAnswer: "iii. The two main types of sleep" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: A3_HEADINGS, correctAnswer: "ix. How memories are stored at night" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: A3_HEADINGS, correctAnswer: "vi. The body's internal clock" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: A3_HEADINGS, correctAnswer: "iv. Consequences of repeated short nights" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: A3_HEADINGS, correctAnswer: "i. The brain's overnight cleaning routine" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: A3_HEADINGS, correctAnswer: "viii. A function still under debate" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Modern sleep research began before the Second World War.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Children spend more time in deep non-REM sleep than adults do.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "REM sleep accounts for most of an adult's night.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Teenage sleep patterns are linked to hormonal changes.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most countries have introduced school-start-time reforms in response to teenage sleep needs.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A causal link between sleep deprivation and dementia has been firmly established.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Caffeine can permanently replace the need for sleep.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A complete sleep cycle lasts roughly ninety minutes.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The body releases growth hormone during the deepest stage of non-REM sleep.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A single night of poor sleep has no measurable effect on the immune system.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
    ],
  },

  // =====================================================================
  // SLOT B — Multiple Choice + Sentence Completion (FILL_BLANK)
  // =====================================================================
  {
    slot: "B",
    title: "The First Skyscrapers",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Today, tall buildings are so common that few city dwellers stop to consider how unusual they once were. For most of human history, the height of a building was limited by two practical problems. The first was structural: stone and brick walls could only carry a certain load before they had to be made impossibly thick at the base. The second was human: nobody wanted to climb more than about five flights of stairs to reach an apartment or office. Until both problems were solved, the modern skyline was simply not possible.

The breakthrough came in nineteenth-century Chicago. After a great fire destroyed much of the city in 1871, a generation of architects and engineers found themselves with a rare opportunity: a downtown almost entirely cleared, and a population eager to rebuild quickly on land that had become extremely valuable. The economic pressure pushed designers to think upward, and a series of experiments soon led to a radically new way of constructing tall buildings.

The key innovation was a load-bearing frame made of steel rather than masonry. In a traditional building, the walls themselves supported the floors above; in the new design, a steel skeleton carried the entire load, and the outer walls could be reduced to thin "curtains" of brick or, eventually, glass. The first building to use this method, the Home Insurance Building of 1885, rose to ten storeys and was, by the standards of the day, astonishingly light. It is now widely regarded as the world's first true skyscraper.

Steel alone, however, could not have produced the high-rise city. A second invention was equally important: the safety elevator, patented by Elisha Otis in 1853. Earlier hoists existed, but they were considered too dangerous for passenger use, since a snapped cable meant a fatal fall. Otis demonstrated a brake that locked automatically if the rope failed, and within a few decades passenger elevators had become standard in every building of more than four floors. With the climb removed as a barrier, the upper storeys of a tower could be as desirable as the lower ones — sometimes more so, for the view.

By 1900, Chicago and New York were competing to build the tallest structure in the world. The Singer Building, the Metropolitan Life Tower and finally the Woolworth Building each held the record for a few years before being overtaken. Their architects faced new questions that earlier builders had never imagined: how to deliver water to upper floors, how to anchor a thin tower against the wind, and how to evacuate hundreds of workers in an emergency. These problems were solved one by one, but no later innovation was as profound as the original Chicago shift from wall to frame.

The legacy is everywhere. From Shanghai to São Paulo, the steel-and-glass tower is now the default form of urban building, and a typical office worker may spend most of their career hundreds of metres above the ground. Critics argue that this verticality has come at a cost — to street life, to wind patterns, to the human sense of scale — but the underlying logic, born in a rebuilt Chicago, has never been seriously challenged.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "What were the two main barriers to tall buildings before the late 1800s?", options: ["Cost and labour shortages", "Wall strength and the difficulty of climbing stairs", "Lack of materials and fear of fire", "Wind loads and poor lighting"], correctAnswer: "Wall strength and the difficulty of climbing stairs" },
      { type: QuestionType.MCQ, prompt: "Why did Chicago lead the way in skyscraper design?", options: ["It had the most architects in the world", "A fire had cleared land and demand to rebuild was urgent", "It was the first city to discover steel", "It had no building regulations"], correctAnswer: "A fire had cleared land and demand to rebuild was urgent" },
      { type: QuestionType.MCQ, prompt: "What was the key difference between traditional buildings and the new design?", options: ["The new design used wood instead of stone", "The new design had thicker outer walls", "A steel skeleton, not the walls, carried the load", "The new design had no foundations"], correctAnswer: "A steel skeleton, not the walls, carried the load" },
      { type: QuestionType.MCQ, prompt: "Why was the Otis elevator so significant?", options: ["It was the first elevator ever built", "It was cheap to manufacture", "It included a brake that engaged if the cable failed", "It allowed buildings to be heated more efficiently"], correctAnswer: "It included a brake that engaged if the cable failed" },
      { type: QuestionType.MCQ, prompt: "What was an unexpected effect of safe passenger elevators?", options: ["Buildings became shorter", "Upper floors became at least as valuable as lower ones", "Office workers preferred ground-floor offices", "Construction times increased"], correctAnswer: "Upper floors became at least as valuable as lower ones" },
      { type: QuestionType.MCQ, prompt: "What is the writer's main point in the final paragraph?", options: ["Skyscrapers are no longer being built", "The criticisms of skyscrapers have led to a change in design", "The fundamental method developed in Chicago is still in use today", "Wind problems have never been solved"], correctAnswer: "The fundamental method developed in Chicago is still in use today" },
      { type: QuestionType.MCQ, prompt: "How is the Home Insurance Building described?", options: ["As the tallest building of the nineteenth century", "As surprisingly light for its time", "As a failed experiment", "As built entirely from glass"], correctAnswer: "As surprisingly light for its time" },
      { type: QuestionType.MCQ, prompt: "Which of the following is NOT mentioned as a new challenge faced by early skyscraper architects?", options: ["Delivering water to upper floors", "Anchoring a thin tower against the wind", "Evacuating workers in an emergency", "Reducing the cost of steel"], correctAnswer: "Reducing the cost of steel" },
      // Group 2: Sentence Completion — NO MORE THAN TWO WORDS
      { type: QuestionType.FILL_BLANK, prompt: "Before the late 1800s, the maximum useful height of a building was constrained by the strength of its walls and by the human limit on climbing ___.", correctAnswer: "stairs" },
      { type: QuestionType.FILL_BLANK, prompt: "In 1871, much of central Chicago was destroyed by a great ___.", correctAnswer: "fire" },
      { type: QuestionType.FILL_BLANK, prompt: "In the new method, the outer walls of a tall building were reduced to thin ___ rather than carrying the building's weight.", correctAnswer: "curtains" },
      { type: QuestionType.FILL_BLANK, prompt: "The Home Insurance Building of 1885 had ten ___ and is regarded as the first true skyscraper.", correctAnswer: "storeys" },
      { type: QuestionType.FILL_BLANK, prompt: "Elisha Otis demonstrated a ___ that locked automatically if a lift cable broke.", correctAnswer: "brake" },
      { type: QuestionType.FILL_BLANK, prompt: "Architects of early skyscrapers had to find ways to anchor a thin tower against the ___.", correctAnswer: "wind" },
      { type: QuestionType.FILL_BLANK, prompt: "Critics of high-rise design say that the verticality has come at a cost to street life and to the human sense of ___.", correctAnswer: "scale" },
      { type: QuestionType.FILL_BLANK, prompt: "The key load-bearing frame of the new buildings was made of ___ rather than masonry.", correctAnswer: "steel" },
    ],
  },
  {
    slot: "B",
    title: "Vertical Farming Comes of Age",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `The image is hard to forget: row upon row of leafy greens, stacked from floor to ceiling under banks of purple LEDs, growing inside a building that was once a warehouse, a shipping container, or a disused car park. Vertical farming, dismissed as a curiosity only a decade ago, has quietly become one of the fastest-growing branches of agriculture. Whether it can ever feed the world, however, remains an open question.

The basic idea is straightforward. Plants are grown indoors on shelves rather than fields, with their roots immersed either in nutrient-rich water (a method called hydroponics) or in a fine mist of dissolved fertiliser (aeroponics). Light, temperature, humidity and carbon dioxide are all controlled precisely. The plants never see daylight, never encounter pests, and never depend on weather. Because growth is uninterrupted, a vertical farm can produce up to twenty harvests of leafy salad a year — far more than a conventional outdoor field.

Water use is similarly transformed. Traditional irrigation loses much of its water to evaporation and run-off; in a closed indoor system, the same water is captured, sterilised and recirculated. The largest commercial vertical farms now claim to use about ninety-five per cent less water per kilogramme of produce than open-field equivalents. Land savings are also enormous: a single multi-storey building can replace dozens of fields and can be placed inside the city it supplies, eliminating long transport chains.

These advantages come with a serious caveat. Replacing the sun with artificial light is extraordinarily expensive. Electricity to run the LEDs is by far the largest cost in any vertical farm, typically accounting for forty to sixty per cent of total expenditure. Crops that grow quickly and sell at a high price — herbs, salad leaves, microgreens — can absorb this cost. Wheat, rice and most other staple foods cannot. For the foreseeable future, vertical farming is therefore confined to a small range of products.

There is also an environmental paradox. If the electricity is generated from coal or gas, the carbon footprint of indoor lettuce may be higher than that of imported produce grown outdoors. A growing number of operators have responded by moving to regions with cheap renewable energy or by building solar capacity on-site. Some experimental farms in northern Europe now claim a net-zero footprint, but they remain the exception rather than the rule.

The most promising future may lie in hybrid arrangements. Outdoor agriculture continues to handle the vast quantities of grain, oil and protein that humanity requires, while indoor farms supply the delicate, perishable greens that have always been hardest to transport. In places facing genuine scarcity — desert cities, polar research stations, or future colonies on Mars — the ability to grow fresh food inside a sealed building is no longer a luxury but a necessity. The challenge for the rest of the world is more familiar: deciding which problems vertical farming is worth solving, and which can still be left to the open sky.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What does the writer say about vertical farming a decade ago?", options: ["It was already well established", "It was considered an unusual or unlikely idea", "It was banned in most countries", "It was used only for tomatoes"], correctAnswer: "It was considered an unusual or unlikely idea" },
      { type: QuestionType.MCQ, prompt: "Which of the following is NOT a feature of indoor growing systems described in paragraph 2?", options: ["Controlled temperature", "Roots in water or mist", "Pest-free environment", "Reduced labour costs"], correctAnswer: "Reduced labour costs" },
      { type: QuestionType.MCQ, prompt: "Why do vertical farms produce more harvests per year than fields?", options: ["Indoor crops grow larger", "Plants are not interrupted by weather", "Workers are present at all times", "Seeds are genetically modified"], correctAnswer: "Plants are not interrupted by weather" },
      { type: QuestionType.MCQ, prompt: "What is described as the main cost of running a vertical farm?", options: ["Building maintenance", "Worker salaries", "Electricity for lighting", "Imported nutrients"], correctAnswer: "Electricity for lighting" },
      { type: QuestionType.MCQ, prompt: "Why is vertical farming unsuitable for crops such as wheat?", options: ["Wheat grows too slowly to justify the lighting cost", "Wheat needs soil that cannot be reproduced indoors", "Wheat is too tall to fit in stacked shelves", "Wheat cannot grow under LED light"], correctAnswer: "Wheat grows too slowly to justify the lighting cost" },
      { type: QuestionType.MCQ, prompt: "What does the writer suggest about vertical farming's future?", options: ["It will replace traditional farming completely", "It is doomed unless costs fall sharply", "It will likely coexist with outdoor agriculture in a complementary role", "It will only succeed in tropical countries"], correctAnswer: "It will likely coexist with outdoor agriculture in a complementary role" },
      { type: QuestionType.MCQ, prompt: "How have some operators responded to the environmental paradox of indoor farming?", options: ["By switching to outdoor cultivation", "By moving to regions with cheap renewable energy", "By abandoning leafy greens", "By reducing the height of their buildings"], correctAnswer: "By moving to regions with cheap renewable energy" },
      { type: QuestionType.MCQ, prompt: "In which settings does the writer say indoor food production becomes a necessity rather than a luxury?", options: ["Large coastal cities", "Desert cities and polar research stations", "Traditional farming regions", "Tropical river valleys"], correctAnswer: "Desert cities and polar research stations" },
      { type: QuestionType.FILL_BLANK, prompt: "In hydroponics, the plants' roots are placed in nutrient-rich ___.", correctAnswer: "water" },
      { type: QuestionType.FILL_BLANK, prompt: "Aeroponic systems supply nutrients to the roots as a fine ___ of dissolved fertiliser.", correctAnswer: "mist" },
      { type: QuestionType.FILL_BLANK, prompt: "The largest commercial vertical farms claim to use around 95 per cent less ___ than outdoor farming.", correctAnswer: "water" },
      { type: QuestionType.FILL_BLANK, prompt: "Indoor farms can be located inside the city they supply, eliminating long ___ chains.", correctAnswer: "transport" },
      { type: QuestionType.FILL_BLANK, prompt: "Electricity for the LEDs typically accounts for forty to sixty per cent of a vertical farm's total ___.", correctAnswer: "expenditure" },
      { type: QuestionType.FILL_BLANK, prompt: "If the electricity comes from coal or gas, indoor lettuce can have a higher carbon ___ than imported produce.", correctAnswer: "footprint" },
      { type: QuestionType.FILL_BLANK, prompt: "A vertical farm can produce up to twenty ___ of leafy salad in a single year.", correctAnswer: "harvests" },
    ],
  },
  {
    slot: "B",
    title: "Why We Forget: The Mechanics of Memory",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Most people complain about their memories at some point — names that slip away the moment they are needed, a fact that was certain only a week ago, the disorienting blankness of walking into a room and forgetting why. For more than a century, psychologists assumed that forgetting was a kind of leakage: information stored imperfectly, then gradually lost. Modern neuroscience suggests something rather different. Forgetting is not a failure of the brain but one of its most important functions.

In the late nineteenth century, the German researcher Hermann Ebbinghaus carried out one of the earliest experiments on memory. Working alone, he memorised long lists of nonsense syllables and then tested himself at varying intervals. His results produced what is now known as the forgetting curve, a sharp decline in recall during the first hours after learning, followed by a much slower fade over the following days. Although the curve has been refined many times since, its general shape remains the foundation of memory research.

Modern brain imaging has helped to explain why this happens. Each new experience produces patterns of activity that pass through the hippocampus, a small structure deep in the brain. If a memory is to be kept, the hippocampus replays the pattern during sleep, transferring it to the larger surface of the cortex. Memories that are not replayed enough times are deliberately pruned. Researchers have identified specific molecules that mark a connection for deletion, and even drugs that block the process, suggesting that forgetting is an active task rather than a passive loss.

The benefits of this housekeeping are easy to overlook. A brain that remembered everything would struggle to find what it needed: each new question would compete with thousands of irrelevant details from years past. Patients with a rare condition called hyperthymesia, who recall almost every day of their lives in vivid detail, often describe their memories as exhausting rather than useful. The clutter of past experience makes ordinary decisions surprisingly difficult.

Some forgetting is more troubling. The "tip of the tongue" experience — when a word is clearly known but temporarily unavailable — is common at every age but increases through middle life. Names tend to vanish more readily than common nouns, because names rarely fit into the meaningful networks that make other words easier to retrieve. Stress, fatigue and distraction worsen the problem, but in most cases the missing word emerges of its own accord within minutes or hours.

Severe memory loss, of the kind seen in dementia, is a different matter. Here the underlying brain tissue degenerates, and the orderly process of pruning gives way to chaotic deletion. No drug has yet been shown to reverse the damage, though early diagnosis combined with exercise, social engagement and certain medications can slow it. For everyday forgetting, however, the best response is reassurance. The mind that loses an appointment or a name has not broken down; it is, in most cases, simply doing its job.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Why did psychologists once think people forget?", options: ["The brain is too small", "Information was stored imperfectly and gradually lost", "All forgetting was caused by stress", "Memory only worked while asleep"], correctAnswer: "Information was stored imperfectly and gradually lost" },
      { type: QuestionType.MCQ, prompt: "What does modern neuroscience suggest about forgetting?", options: ["It happens only in old age", "It is an important brain function", "It can be eliminated by training", "It is caused by lack of sleep alone"], correctAnswer: "It is an important brain function" },
      { type: QuestionType.MCQ, prompt: "What does Ebbinghaus's forgetting curve show?", options: ["A steady straight line of memory loss", "A sharp early drop followed by slower fading", "An increase in memory after one week", "Total loss after one month"], correctAnswer: "A sharp early drop followed by slower fading" },
      { type: QuestionType.MCQ, prompt: "What happens to a memory during sleep?", options: ["It moves to the hippocampus", "It is permanently lost", "It is replayed and transferred to the cortex", "It is shared with other people"], correctAnswer: "It is replayed and transferred to the cortex" },
      { type: QuestionType.MCQ, prompt: "What is suggested by patients with hyperthymesia?", options: ["Remembering everything is always useful", "A perfect memory may complicate decisions", "Their condition can be cured easily", "They forget more than average people"], correctAnswer: "A perfect memory may complicate decisions" },
      { type: QuestionType.MCQ, prompt: "Why do names slip away more easily than common nouns?", options: ["Names are heard less often", "Names rarely connect to meaningful networks", "Names are stored in a different brain region", "Names are usually too long"], correctAnswer: "Names rarely connect to meaningful networks" },
      { type: QuestionType.MCQ, prompt: "What evidence suggests that forgetting is an active process?", options: ["The brain shrinks with age", "Specific molecules mark connections for deletion", "People forget faster when tired", "Memories return after exercise"], correctAnswer: "Specific molecules mark connections for deletion" },
      { type: QuestionType.MCQ, prompt: "How is memory loss in dementia different from everyday forgetting?", options: ["It can be reversed with current drugs", "The brain tissue itself degenerates and deletion becomes chaotic", "It affects only names, not facts", "It improves with age"], correctAnswer: "The brain tissue itself degenerates and deletion becomes chaotic" },
      { type: QuestionType.FILL_BLANK, prompt: "Ebbinghaus produced the forgetting ___, showing rapid initial loss of memory.", correctAnswer: "curve" },
      { type: QuestionType.FILL_BLANK, prompt: "New experiences pass through the ___, a small structure deep in the brain.", correctAnswer: "hippocampus" },
      { type: QuestionType.FILL_BLANK, prompt: "Memories that are not replayed sufficiently are actively ___ from the brain.", correctAnswer: "pruned" },
      { type: QuestionType.FILL_BLANK, prompt: "A brain that retained everything would have trouble locating what it needed, because each new question would compete with irrelevant ___.", correctAnswer: "details" },
      { type: QuestionType.FILL_BLANK, prompt: "The 'tip of the tongue' experience is more common in middle ___.", correctAnswer: "life" },
      { type: QuestionType.FILL_BLANK, prompt: "In dementia, the orderly process of pruning gives way to ___ deletion.", correctAnswer: "chaotic" },
      { type: QuestionType.FILL_BLANK, prompt: "Decline associated with dementia can sometimes be slowed by exercise, social engagement and certain ___.", correctAnswer: "medications" },
    ],
  },

  // =====================================================================
  // SLOT C — Matching Information (which paragraph) + Sentence Completion (FILL_BLANK)
  // =====================================================================
  {
    slot: "C",
    title: "Three Theories of Dinosaur Extinction",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `For more than a century, the disappearance of the dinosaurs at the end of the Cretaceous period has been one of the most studied — and most disputed — events in the history of life on Earth. The fossil record makes the basic facts clear enough: roughly 66 million years ago, a thriving group of animals that had dominated the planet for over 150 million years was abruptly reduced to a handful of bird-like survivors. What is far less clear is exactly how, and why, this happened.

A  Until the late 1970s, most palaeontologists favoured a gradual explanation. They observed that dinosaur diversity already appeared to be in decline for several million years before the final extinction, with fewer new species replacing those that died out. Slow shifts in climate, changes in vegetation and competition from emerging mammal groups were all suggested as contributing pressures. The picture was of a long, drawn-out fade rather than a single dramatic event.

B  This consensus was overturned in 1980 by the American physicist Luis Alvarez and his geologist son Walter. Working with samples taken from a thin layer of clay at the boundary of the Cretaceous and Paleogene periods, they discovered an extraordinarily high concentration of the rare metal iridium — far higher than anything produced by ordinary geological processes. Iridium is, however, common in certain types of asteroid. The Alvarezes proposed that a single, massive impact had ended the Cretaceous: a body roughly ten kilometres across had collided with the Earth, releasing energy equivalent to a billion atomic bombs.

C  Initial reactions were sceptical, but evidence steadily accumulated. The crater itself, buried under sediment and seawater near the modern Mexican town of Chicxulub, was identified in 1991. Tiny spheres of melted glass, scattered shocked-quartz crystals and disturbed marine sediments along the coastlines of the Americas all point to an event of catastrophic violence. By the end of the twentieth century, the impact theory had become the standard explanation in most textbooks.

D  A third theory has, however, refused to disappear. Around the same period, a vast outpouring of lava in what is now central India produced a sequence of basalt layers known as the Deccan Traps. Eruptions of this scale would have injected enormous quantities of sulphur dioxide and carbon dioxide into the atmosphere, alternately darkening the sky, cooling the planet and, over longer time-scales, warming it. Some researchers argue that these eruptions alone could have driven the extinction; others place them as a contributing factor that weakened ecosystems before the asteroid arrived.

E  Recent dating work has sharpened the debate. The Chicxulub impact and the main phase of Deccan volcanism appear to have occurred within a few hundred thousand years of each other — a geological eye-blink. Some scientists now suspect the impact itself may have triggered the most violent volcanic episode, by sending seismic shockwaves through the planet. Whether the dinosaurs were finished off by fire from above, fire from below, or both at once, remains an active question.

F  What is no longer in doubt is the speed of the final collapse. Detailed studies of fossil pollen and microscopic marine organisms suggest that ecosystems were transformed within years rather than millennia. The mass extinction at the end of the Cretaceous is now usually classified as both severe and abrupt — the closest geological analogue we possess to the rapid biodiversity loss currently underway.`,
    questions: [
      // Group 1: Matching Information (which paragraph contains...)
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to a piece of physical evidence located in present-day Mexico.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A view that dinosaur numbers were falling long before they disappeared.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A suggestion that one event could have set off another.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "Reference to the chemical element used as the first clue for the impact theory.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A comparison between this past extinction and modern biodiversity loss.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of long-lasting volcanic activity in what is now India.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of why some scientists once viewed extinction as a slow process.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of evidence found along American coastlines.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      // Group 2: Sentence Completion — NO MORE THAN THREE WORDS
      { type: QuestionType.FILL_BLANK, prompt: "The dinosaur extinction occurred roughly 66 million ___ ago.", correctAnswer: "years" },
      { type: QuestionType.FILL_BLANK, prompt: "The impact theory was proposed in 1980 by Luis Alvarez and his geologist son ___.", correctAnswer: "Walter" },
      { type: QuestionType.FILL_BLANK, prompt: "An unusually high concentration of the rare metal ___ was found at the Cretaceous-Paleogene boundary.", correctAnswer: "iridium" },
      { type: QuestionType.FILL_BLANK, prompt: "The buried crater near the modern Mexican town of ___ was identified in 1991.", correctAnswer: "Chicxulub" },
      { type: QuestionType.FILL_BLANK, prompt: "The Indian basalt layers linked to massive eruptions are known as the Deccan ___.", correctAnswer: "Traps" },
      { type: QuestionType.FILL_BLANK, prompt: "According to paragraph F, ecosystems were transformed within ___ rather than millennia.", correctAnswer: "years" },
      { type: QuestionType.FILL_BLANK, prompt: "The Alvarezes proposed that an asteroid roughly ten ___ across had collided with the Earth.", correctAnswer: "kilometres" },
    ],
  },
  {
    slot: "C",
    title: "The Hidden Network of Tree Roots",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Walk into a mature forest and the trees seem to stand alone — silent, immobile, indifferent to their neighbours. Beneath the soil, however, recent research has revealed a startlingly different picture: an interconnected network of roots and fungi through which trees share water, nutrients and even chemical warnings. The discovery has changed how ecologists understand the forest, and is beginning to influence how foresters manage it.

A  The key player in this underground network is not the tree itself but a group of fungi known as mycorrhizae. Their fine threads, only a few microns across, wrap around or grow inside the tips of plant roots. A single teaspoon of forest soil can contain several kilometres of these threads. Acting as biological pipework, the fungi extend a tree's effective root system by hundreds of times, drawing in water and minerals that the tree alone could never reach.

B  This is not a one-sided arrangement. The tree supplies the fungus with sugars produced by photosynthesis, in some forests devoting as much as a third of its total energy budget to feeding its underground partner. The relationship has existed for more than 400 million years; fossils of early land plants already show fungal threads embedded in their tissues. Without this partnership, terrestrial plants might never have evolved beyond a thin layer of green close to the water.

C  Mycorrhizal networks link not just one tree to its fungus but many trees to each other. Using radioactive tracers, the Canadian ecologist Suzanne Simard first demonstrated in the 1990s that carbon moved through the soil from one tree species to another by way of the fungal threads. Later experiments confirmed that dying trees often release their remaining sugars into the network, where younger or shaded trees can absorb them. In effect, an old tree may continue to support its forest after its own leaves have fallen.

D  The network also carries signals. When a tree is attacked by insects, chemical warnings produced by its damaged leaves can travel underground to neighbouring trees, prompting them to manufacture defensive compounds before they themselves are attacked. Similar signals have been recorded in response to drought and frost. The signals do not always reach every tree, and some species appear to be more generous transmitters than others, but the underground communication is now well documented.

E  Foresters have begun to take notice. In traditional plantations, soils are repeatedly disturbed and dominant species planted in single-age stands, both practices that damage mycorrhizal networks. By contrast, "continuous-cover" forestry leaves the soil undisturbed and selectively removes only the largest trees, allowing the fungal network to remain intact. In trials across Scandinavia and the Pacific Northwest, plots managed in this way have shown faster regrowth, greater resistance to pests, and lower rates of soil erosion.

F  Not every claim about the "wood-wide web" has stood up to scrutiny. Some researchers caution that the most dramatic stories — of trees nursing distant cousins, or of forests behaving like a single conscious organism — go beyond what the data support. What is clear is that trees are far less isolated than they appear, and that the long-overlooked partnership between root and fungus may turn out to be one of the most important biological relationships on the planet.`,
    questions: [
      { type: QuestionType.MATCHING_INFO, prompt: "A claim that some popular descriptions of the network exceed the evidence.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "A historical perspective on how long the plant-fungus partnership has existed.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "Examples of forestry methods that protect the underground network.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of how chemical alerts move from one tree to another.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of how a dying tree may help support younger neighbours.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A measurement of how dense the fungal threads are in soil.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "The name of a scientist who used radioactive tracers in 1990s experiments.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to results from trials in Scandinavia and the Pacific Northwest.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.FILL_BLANK, prompt: "The fungi that connect to plant roots are known as ___.", correctAnswer: "mycorrhizae" },
      { type: QuestionType.FILL_BLANK, prompt: "A single ___ of forest soil can contain several kilometres of fungal threads.", correctAnswer: "teaspoon" },
      { type: QuestionType.FILL_BLANK, prompt: "A tree may devote as much as a ___ of its total energy budget to feeding its fungus partner.", correctAnswer: "third" },
      { type: QuestionType.FILL_BLANK, prompt: "Carbon transfer between trees in the 1990s was first demonstrated by the Canadian ecologist Suzanne ___.", correctAnswer: "Simard" },
      { type: QuestionType.FILL_BLANK, prompt: "To track the movement of carbon, Simard used radioactive ___.", correctAnswer: "tracers" },
      { type: QuestionType.FILL_BLANK, prompt: "Forestry that leaves the soil undisturbed is described as \"continuous-___\" forestry.", correctAnswer: "cover" },
      { type: QuestionType.FILL_BLANK, prompt: "The plant-fungus relationship has existed for more than 400 million ___.", correctAnswer: "years" },
    ],
  },
  {
    slot: "C",
    title: "Restoring the World's Forgotten Languages",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Of the seven thousand languages currently spoken on Earth, linguists estimate that nearly half will fall silent before the end of this century. A language disappears every two weeks. Yet in recent decades, a small but growing number of communities have attempted the opposite trajectory: bringing back tongues that had stopped being spoken at home, or were close to doing so. Their successes are uneven, but the lessons they offer are increasingly studied around the world.

A  The most ambitious of these projects is also the oldest. Hebrew, the language of ancient Israel, ceased to be used in daily speech around the second century CE, surviving only as a written and liturgical language. In the late nineteenth century, a Lithuanian-born scholar named Eliezer Ben-Yehuda began coining new words for modern concepts and refusing to speak any other language with his family. Within fifty years, Hebrew had become the everyday language of a new state. The Hebrew case is, however, unusual: religious devotion had kept the written language alive for nearly two millennia, providing a foundation that few endangered languages still possess.

B  Other revivals are more grass-roots. In the highlands of Wales, Welsh had lost most of its young speakers by the 1960s, when activists campaigned for road signs, broadcasting and bilingual education. Government recognition followed, and by the most recent census the proportion of Welsh speakers under thirty had risen for the first time in over a century. Similar patterns have been recorded in Catalonia, the Basque Country and parts of Quebec — places where strong local institutions made it possible to insist on the public use of a smaller language alongside a dominant one.

C  In other regions, the work is harder. Many indigenous languages of North America and Australia survive only in the memories of a handful of elderly speakers, with no remaining children growing up bilingual. The Hawaiian language, reduced to a few thousand speakers by the late twentieth century, has been partially rebuilt through immersion schools that conduct every lesson in Hawaiian from the earliest grades. Two generations on, several hundred families now use the language at home. The model has been adapted with varying success for Māori, Cherokee and Mohawk.

D  Technology has begun to play a role. Apps designed for endangered languages, online dictionaries assembled from old recordings, and machine-learning tools that suggest plausible reconstructions of lost vocabulary have all become more common. Critics argue that an app cannot replace a parent or grandparent, and that the speakers who matter most are the children who hear a language in the kitchen. Supporters reply that any door into a language is better than none.

E  Linguists disagree about what counts as success. By the strictest definition, a revived language must again be the everyday speech of a community; by a looser one, even a small number of fluent speakers, supported by literature and music, marks a kind of survival. The cases of Hebrew, Welsh and Hawaiian sit at different points along this scale, but they share a common requirement: deliberate effort over decades, sustained across generations, in the face of a culture that often pushes in the opposite direction.

F  The motivation runs deeper than nostalgia. Each language carries unique categories — for plants and animals, for emotions, for landscapes — that disappear with it. The loss is irreversible, and revival, where it succeeds, is one of the most striking examples of human communities turning back what had appeared to be a one-way decline.`,
    questions: [
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to a debate over what should count as a successfully revived language.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "Examples of regions where governments officially recognised a minority language.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of why religion was important in keeping a language available for revival.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "Mention of an objection to relying on digital tools.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of schools where all teaching is in the endangered language.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A statement about the loss of unique cultural categories.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "An example of one person beginning a deliberate revival project.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to indigenous languages remembered only by a few elderly speakers.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.FILL_BLANK, prompt: "According to the writer, a language disappears every two ___.", correctAnswer: "weeks" },
      { type: QuestionType.FILL_BLANK, prompt: "New Hebrew words were coined in the late nineteenth century by Eliezer ___.", correctAnswer: "Ben-Yehuda" },
      { type: QuestionType.FILL_BLANK, prompt: "Hawaiian has been partially rebuilt through ___ schools that teach entirely in the language.", correctAnswer: "immersion" },
      { type: QuestionType.FILL_BLANK, prompt: "The Hawaiian immersion model has been adapted for Māori, Cherokee and ___.", correctAnswer: "Mohawk" },
      { type: QuestionType.FILL_BLANK, prompt: "In Wales, the proportion of young Welsh speakers rose for the first time in over a ___.", correctAnswer: "century" },
      { type: QuestionType.FILL_BLANK, prompt: "Paragraph F describes the loss of a language as ___.", correctAnswer: "irreversible" },
      { type: QuestionType.FILL_BLANK, prompt: "Linguists estimate that nearly half of the world's seven thousand languages will fall silent before the end of this ___.", correctAnswer: "century" },
    ],
  },

  // =====================================================================
  // SLOT D — Multiple Choice + True/False/Not Given
  // =====================================================================
  {
    slot: "D",
    title: "Three Pioneers of Aviation",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `In the four decades between 1903 and 1947, human flight was transformed from a brief, fragile experiment into a routine form of long-distance travel. Three figures stand out from the crowded history of that era. Each broke a record that earlier generations had considered impossible, and each was shaped by his or her time in ways that the others were not.

A — The Wright Brothers
Wilbur and Orville Wright ran a small bicycle workshop in Dayton, Ohio, when they began experimenting with gliders in the late 1890s. They were not formally trained engineers, and unlike most of their rivals they made their living from a craft business rather than government grants or industrial backing. Their key insight was that controlling an aircraft in flight, not merely lifting it, was the unsolved problem. By building a small wind tunnel and testing scale wings, they developed a system of "wing-warping" that allowed pilots to bank into turns. Their first powered flight at Kitty Hawk in December 1903 lasted only twelve seconds, but it established the principles still used by every aircraft today.

B — Amelia Earhart
Amelia Earhart did not invent any new aviation technology. Her significance lay in what she did with the technology that existed. In 1932 she became the first woman to fly solo across the Atlantic, a flight that began in Newfoundland and ended on a farmer's field in Northern Ireland after fifteen hours of fog, ice and engine trouble. She used her fame to argue for the inclusion of women in commercial and military aviation and to advise the US government on training and safety. She disappeared in 1937 during an attempt to circle the globe along the equator; the cause has never been determined, and the wreckage of her aircraft has never been recovered.

C — Charles Lindbergh
Charles Lindbergh, a former mail pilot from Minnesota, won lasting fame in May 1927 by making the first solo non-stop flight from New York to Paris. The single-engined Spirit of St. Louis carried him for thirty-three and a half hours across an unbroken expanse of ocean, with no radio and almost no margin for error. The achievement won him a $25,000 prize and a level of public attention that would today be reserved for film stars. Unlike the other pioneers, Lindbergh later played an active role in commercial aviation, helping to plan the first transcontinental routes for two American airlines.

D — Howard Hughes
Less remembered today than the others, Howard Hughes was nevertheless one of the most influential figures in pre-war aviation. Trained as an engineer and bankrolled by a family fortune in oil-drilling equipment, Hughes designed and personally tested several record-breaking aircraft. In 1938 he completed a circumnavigation of the globe in just under four days, less than half the time of any earlier attempt. He later founded an aircraft manufacturer that built the giant H-4 transport plane — popularly nicknamed the "Spruce Goose" — although the project arrived too late to influence the Second World War.

By the end of the 1940s, the headline-grabbing era was over. Long-distance flight had become an industry, and individual pilots were no longer national celebrities. Yet the records and reputations set by these four figures continued to shape the public understanding of what aviation could be for decades afterwards.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "How did the Wright Brothers earn a living before their aviation work?", options: ["Through government grants", "From a bicycle workshop", "As trained engineers", "Through industrial backing"], correctAnswer: "From a bicycle workshop" },
      { type: QuestionType.MCQ, prompt: "What did the Wright Brothers identify as the main unsolved problem of flight?", options: ["Generating enough lift", "Building a light enough engine", "Controlling an aircraft in flight", "Finding a suitable launch site"], correctAnswer: "Controlling an aircraft in flight" },
      { type: QuestionType.MCQ, prompt: "What is said about Amelia Earhart's contribution to aviation?", options: ["She invented several new aircraft", "Her significance lay in how she used existing technology", "She built the first commercial airliner", "She trained the US military to fly"], correctAnswer: "Her significance lay in how she used existing technology" },
      { type: QuestionType.MCQ, prompt: "Where did Earhart's 1932 transatlantic flight end?", options: ["In Newfoundland", "On a farmer's field in Northern Ireland", "In Paris", "On the equator"], correctAnswer: "On a farmer's field in Northern Ireland" },
      { type: QuestionType.MCQ, prompt: "What made Charles Lindbergh's 1927 flight remarkable?", options: ["It was the first flight across the Pacific", "It was the first solo non-stop flight from New York to Paris", "It used a multi-engined aircraft", "It was funded by the US government"], correctAnswer: "It was the first solo non-stop flight from New York to Paris" },
      { type: QuestionType.MCQ, prompt: "In what way was Lindbergh different from the other pioneers?", options: ["He never broke any records", "He later helped plan commercial air routes", "He was a trained engineer", "He worked only outside the United States"], correctAnswer: "He later helped plan commercial air routes" },
      { type: QuestionType.MCQ, prompt: "How was Howard Hughes's aviation work funded?", options: ["By government grants", "By a family fortune in oil-drilling equipment", "By prize money", "By an aircraft manufacturer"], correctAnswer: "By a family fortune in oil-drilling equipment" },
      { type: QuestionType.MCQ, prompt: "What does the writer say about individual pilots by the end of the 1940s?", options: ["They were breaking more records than ever", "They were no longer national celebrities", "They had all retired from flying", "They had founded their own airlines"], correctAnswer: "They were no longer national celebrities" },
      // Group 2: True / False / Not Given
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Wright Brothers had formal training as engineers.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Wright Brothers' first powered flight lasted twelve seconds.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Earhart's transatlantic flight took fifteen hours.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The wreckage of Earhart's aircraft was eventually found.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Lindbergh's Spirit of St. Louis was equipped with a radio.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Lindbergh received prize money for his New York to Paris flight.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Hughes's 1938 round-the-world flight took less than half the time of any earlier attempt.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The H-4 transport plane played an important role in the Second World War.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
    ],
  },
  {
    slot: "D",
    title: "Three Inventors Who Changed Music",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `For most of human history, music could only be heard live. The voice or the instrument and the listener had to share the same physical space, and what was performed disappeared into silence the moment the last note died. The twentieth century broke this rule three times over, in three different ways, each through the work of an inventor who often went unrecognised by the audiences whose listening habits they reshaped.

A — Thomas Edison
Thomas Edison did not set out to revolutionise music. His phonograph, demonstrated in 1877, was intended primarily as a dictation device for offices: clerks could record their employers' instructions on a cylinder coated with tinfoil, then play them back. Edison was reportedly puzzled when a market for pre-recorded entertainment emerged within a decade. He resisted the format change from cylinders to flat discs for as long as commercial pressure allowed, and his company eventually fell behind faster-moving rivals. Yet the underlying principle — that sound could be captured, stored and reproduced — was his.

B — Leo Theremin
The Russian engineer Lev Termen, known in the West as Leo Theremin, took the technology of the radio age in an unexpected direction. In 1920 he demonstrated an instrument that produced sound by sensing the position of the player's hands in the air between two antennae. No physical contact was required, and the resulting tone could glide continuously between any two pitches, mimicking the human voice. Theremin's invention had a modest commercial career but a deep influence on later electronic instruments and on film scores from the 1930s onwards. He himself was kidnapped by Soviet agents in 1938 and forced to design listening devices for the KGB; his musical work continued only in scattered private studios.

C — Robert Moog
Robert Moog studied physics at Columbia University before setting up a small workshop in upstate New York. From the early 1960s he developed a series of modular synthesisers in which sound could be shaped by routing electrical signals through filters, oscillators and amplifiers. Earlier electronic instruments had produced fixed tones or required a roomful of equipment; Moog's keyboard-driven design made the synthesiser playable by a single musician. The breakthrough album Switched-On Bach (1968) put his instrument on the bestseller charts and made the term "Moog synthesiser" briefly more famous than the man behind it.

D — Karlheinz Stockhausen
Karlheinz Stockhausen, a composer trained at the Cologne studio for electronic music, treated the new technology as a fundamentally new art form rather than as a means of imitating older instruments. From the 1950s he produced works built from generated tones, recorded environmental sounds and spliced tape. His piece Gesang der Jünglinge (1956) layered an unaccompanied boy's voice with electronic glissandi to create what many critics still regard as the first masterpiece of pure electronic composition. Stockhausen's influence runs through later pop music as well: members of The Beatles, Pink Floyd and Kraftwerk all cited him as a direct inspiration, although his own works remained too austere for a mass audience.

The full social impact of these inventors took decades to unfold. By the end of the twentieth century almost every recorded song bore the fingerprints of one or more of them, often without the audience being aware. Music itself had become a medium that could be carried, copied and consumed anywhere — a transformation as profound as the invention of writing was for the spoken word.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What was Edison's phonograph originally intended for?", options: ["Recording live concerts", "Office dictation", "Broadcasting music", "Teaching music"], correctAnswer: "Office dictation" },
      { type: QuestionType.MCQ, prompt: "Why did Edison's company fall behind its rivals?", options: ["It could not record sound clearly", "He resisted the change from cylinders to flat discs", "It refused to sell to entertainment customers", "He stopped manufacturing phonographs"], correctAnswer: "He resisted the change from cylinders to flat discs" },
      { type: QuestionType.MCQ, prompt: "What was unusual about how Theremin's instrument was played?", options: ["It required two performers", "It produced sound without physical contact", "It could only play a single fixed note", "It needed a roomful of equipment"], correctAnswer: "It produced sound without physical contact" },
      { type: QuestionType.MCQ, prompt: "What happened to Theremin in 1938?", options: ["He moved permanently to the United States", "He was kidnapped by Soviet agents", "He stopped inventing instruments", "He founded a film studio"], correctAnswer: "He was kidnapped by Soviet agents" },
      { type: QuestionType.MCQ, prompt: "What made Moog's synthesiser different from earlier electronic instruments?", options: ["It produced only fixed tones", "Its keyboard-driven design made it playable by one musician", "It required a roomful of equipment", "It could not be used for recordings"], correctAnswer: "Its keyboard-driven design made it playable by one musician" },
      { type: QuestionType.MCQ, prompt: "What was the effect of the album Switched-On Bach?", options: ["It ended interest in synthesisers", "It put Moog's instrument on the bestseller charts", "It was banned from radio", "It made Moog personally famous worldwide"], correctAnswer: "It put Moog's instrument on the bestseller charts" },
      { type: QuestionType.MCQ, prompt: "How did Stockhausen treat the new electronic technology?", options: ["As a way to imitate older instruments", "As a fundamentally new art form", "As a tool for office work", "As a commercial entertainment product"], correctAnswer: "As a fundamentally new art form" },
      { type: QuestionType.MCQ, prompt: "What does the writer say about the social impact of these inventors?", options: ["It was immediate and obvious", "It took decades to unfold", "It was limited to classical music", "It was confined to the United States"], correctAnswer: "It took decades to unfold" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Edison expected a market for pre-recorded entertainment from the start.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Edison's phonograph was demonstrated in 1877.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Theremin's instrument was a major commercial success.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Theremin's invention influenced film scores from the 1930s onwards.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Robert Moog studied physics at Columbia University.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Moog personally performed on the album Switched-On Bach.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Members of The Beatles cited Stockhausen as an influence.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Stockhausen's own works were popular with a mass audience.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
    ],
  },
  {
    slot: "D",
    title: "Cities Built on Water",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `For most of history, building a city on water was a sign not of luxury but of necessity. Defensive moats, fertile river deltas and trading lagoons all forced settlements to grow into and across the water rather than away from it. Three of the world's most famous water-built cities — Venice, Suzhou and Amsterdam — illustrate how very different solutions could emerge from the same basic problem.

A — Venice
Venice was founded in the lagoons of the northern Adriatic by refugees fleeing the collapse of the Western Roman Empire. The shallow water provided defence against horse-mounted invaders, and the islands were stabilised by driving millions of wooden piles into the mud — many still in place today. Buildings rest on these piles, separated from one another by narrow canals that double as the city's main streets. Venice grew into a major maritime power between the eleventh and fifteenth centuries, but its physical structure has been almost unchanged since 1500. Today it faces a different threat: rising sea levels and ground subsidence that bring serious flooding several times each year.

B — Suzhou
Suzhou, in the lower Yangtze region of China, was already a major city when most of Europe was still rural. Its layout, dating from the sixth century BCE, is built around a grid of canals that connect to the Grand Canal — a 1,800-kilometre artificial waterway running the length of eastern China. Suzhou's canals were primarily transport corridors for grain and silk, and its bridges were designed to allow loaded barges to pass underneath. Unlike Venice, the city continued to expand on land throughout its history, with the original water-city becoming a historic core surrounded by a modern industrial conurbation. Many of the older canals have been preserved as cultural and tourism resources rather than working trade routes.

C — Amsterdam
Amsterdam grew rapidly in the seventeenth century, when Dutch merchants needed warehouses close to deep-water shipping. The city's planners responded with the Grachtengordel, a ring of three concentric canals dug around the medieval centre. Each canal was lined with merchant houses tall enough to store cargo on upper floors, narrow enough to share construction costs, and built on wooden piles driven through soft mud to firmer sand below. The system worked so well that Amsterdam's seventeenth-century street plan still organises the city today. The canals are now used mostly for tourism and recreation, but they also play a quieter role as a drainage system, helping the city cope with a country in which much of the land lies below sea level.

D — Comparison and challenges
The three cities offer instructive contrasts. Venice was built primarily for defence and trade by sea, Suzhou for inland river transport, Amsterdam for ocean-going commerce combined with land reclamation. All three face increasing pressure from climate change. Venice's situation is the most acute, but Amsterdam too has invested billions in updated flood-protection systems, and Suzhou worries about subsidence as groundwater is extracted for industry. Their continuing survival is not guaranteed, but their experience has begun to inform planners in younger cities — Jakarta, Manila, New Orleans — for whom water is becoming a problem rather than a resource.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Why, for most of history, were cities built on water?", options: ["For luxury and status", "Out of necessity", "To attract tourists", "To avoid taxation"], correctAnswer: "Out of necessity" },
      { type: QuestionType.MCQ, prompt: "Who founded Venice in the northern Adriatic lagoons?", options: ["Dutch merchants", "Refugees fleeing the collapse of the Western Roman Empire", "Chinese traders", "Horse-mounted invaders"], correctAnswer: "Refugees fleeing the collapse of the Western Roman Empire" },
      { type: QuestionType.MCQ, prompt: "What were Suzhou's canals primarily used for?", options: ["Defence against invaders", "Transporting grain and silk", "Recreation and tourism", "Drainage of floodwater"], correctAnswer: "Transporting grain and silk" },
      { type: QuestionType.MCQ, prompt: "What is the Grachtengordel?", options: ["A flood-protection wall", "A ring of three concentric canals in Amsterdam", "A type of merchant house", "A waterway in China"], correctAnswer: "A ring of three concentric canals in Amsterdam" },
      { type: QuestionType.MCQ, prompt: "Why were Amsterdam's merchant houses built tall and narrow?", options: ["To store cargo on upper floors and share construction costs", "To resist earthquakes", "To allow barges to pass beneath them", "To accommodate large families"], correctAnswer: "To store cargo on upper floors and share construction costs" },
      { type: QuestionType.MCQ, prompt: "Which city's situation does the writer describe as the most acute?", options: ["Suzhou", "Amsterdam", "Venice", "Jakarta"], correctAnswer: "Venice" },
      { type: QuestionType.MCQ, prompt: "What does the writer say about younger cities such as Jakarta and Manila?", options: ["They have solved their water problems", "Water is becoming a problem rather than a resource for them", "They were also built by Roman refugees", "They have abandoned their canals"], correctAnswer: "Water is becoming a problem rather than a resource for them" },
      { type: QuestionType.MCQ, prompt: "What concern is mentioned in connection with Suzhou today?", options: ["Rising sea levels", "Subsidence as groundwater is extracted for industry", "The loss of its bridges", "A shortage of tourists"], correctAnswer: "Subsidence as groundwater is extracted for industry" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Venice's physical structure has changed very little since around 1500.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Suzhou stopped expanding on land after its canals were built.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Grand Canal runs for 1,800 kilometres.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Amsterdam's seventeenth-century street plan still organises the city today.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Venice attracts more tourists than Suzhou and Amsterdam.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Amsterdam has spent billions on updated flood-protection systems.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The wooden piles beneath Venice's buildings have all been replaced with modern materials.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Venice's canals serve as the city's main streets.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
    ],
  },
];
