import { CEFRLevel, QuestionType } from "@prisma/client";
import type { ReadingDataV2 } from "./reading-v2";

/**
 * Reading bank v3 — Slot D expansion.
 *
 * 6 paragraph-labeled IELTS Academic passages, each with EXACTLY 2 question
 * groups: MCQ followed by TRUE_FALSE_NOT_GIVEN. Total 14-16 questions each.
 */
export const READING_V3_D: ReadingDataV2[] = [
  // =====================================================================
  {
    slot: "D",
    title: "The Slow Birth of the Public Museum",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `The idea that a collection of valuable objects should be open to ordinary visitors is a relatively recent one. For most of recorded history, rare paintings, scientific specimens and ancient artefacts were kept in private hands, displayed only to a narrow circle of guests. The transformation of these closed collections into institutions intended for the general public unfolded gradually, and its causes were as much political as cultural.

A  In the sixteenth and seventeenth centuries, wealthy Europeans assembled what were known as cabinets of curiosities. These were rooms, or sometimes whole suites of rooms, crowded with shells, coins, stuffed animals, fossils and instruments. The purpose was not education in any modern sense but the display of personal taste and wealth. Access depended entirely on the owner's goodwill, and a visitor usually needed a letter of introduction from someone the owner already trusted.

B  The first decisive change came in the form of bequests. When a collector died, the question of what should happen to a lifetime's accumulation became urgent. Some collections were simply sold and dispersed, but a number of owners chose instead to leave their holdings to a university or a city, on condition that they be kept together. The Ashmolean in Oxford, opened in 1683, grew from exactly such a gift, and it is often described as the first museum in the modern sense because it admitted paying visitors rather than only invited guests.

C  Political revolution accelerated the process. When the French monarchy fell in the late eighteenth century, the royal art collection was declared the property of the nation. The palace of the Louvre, formerly a royal residence, was reopened in 1793 as a public gallery. The decision was deliberately symbolic: by allowing any citizen to walk among paintings that had once belonged to a king, the new government wished to demonstrate that cultural treasures now belonged to the people as a whole.

D  Yet opening the doors did not immediately make museums welcoming. Throughout much of the nineteenth century, entry was often restricted to certain days, and unaccompanied working people were sometimes turned away on the grounds that they might damage the exhibits or behave inappropriately. Museums also assumed that visitors arrived already knowing what they were looking at; objects were displayed in dense rows with little explanation. The notion that a museum should actively teach its audience emerged only slowly.

E  By the early twentieth century, that notion had taken hold. Curators began to thin out crowded displays, to add written labels and, eventually, to design galleries that told a story. Free admission spread, partly because governments came to see museums as instruments of public education and national pride. The modern museum, with its guided routes, explanatory panels and emphasis on the casual visitor, is therefore the product of several centuries of slow and often contested change rather than a single act of foundation.`,
    questions: [
      // Group 1: MCQ
      { type: QuestionType.MCQ, prompt: "What was the main purpose of a cabinet of curiosities?", options: ["To educate the public", "To display the owner's taste and wealth", "To sell rare objects", "To store scientific records"], correctAnswer: "To display the owner's taste and wealth" },
      { type: QuestionType.MCQ, prompt: "What did a visitor usually need in order to see a private collection?", options: ["A paid ticket", "A university degree", "A letter of introduction", "An appointment with a curator"], correctAnswer: "A letter of introduction" },
      { type: QuestionType.MCQ, prompt: "Why is the Ashmolean often called the first modern museum?", options: ["It was the largest collection of its time", "It admitted paying visitors rather than only invited guests", "It was founded by a monarch", "It was the first to employ curators"], correctAnswer: "It admitted paying visitors rather than only invited guests" },
      { type: QuestionType.MCQ, prompt: "What happened to the French royal art collection after the monarchy fell?", options: ["It was sold to foreign buyers", "It was declared the property of the nation", "It was destroyed by revolutionaries", "It was returned to the royal family"], correctAnswer: "It was declared the property of the nation" },
      { type: QuestionType.MCQ, prompt: "Why was the reopening of the Louvre described as deliberately symbolic?", options: ["It showed cultural treasures now belonged to the people", "It proved the palace was structurally sound", "It marked the return of the monarchy", "It demonstrated French military strength"], correctAnswer: "It showed cultural treasures now belonged to the people" },
      { type: QuestionType.MCQ, prompt: "How were objects typically displayed in nineteenth-century museums?", options: ["In carefully spaced single rows", "In dense rows with little explanation", "Behind locked glass cases", "With detailed printed guidebooks"], correctAnswer: "In dense rows with little explanation" },
      { type: QuestionType.MCQ, prompt: "Why did free admission spread by the early twentieth century?", options: ["Visitor numbers had fallen sharply", "Governments saw museums as instruments of public education", "Collectors demanded it in their bequests", "Buildings could no longer charge entry fees"], correctAnswer: "Governments saw museums as instruments of public education" },
      { type: QuestionType.MCQ, prompt: "What does the writer conclude about the modern museum?", options: ["It was created by a single act of foundation", "It is the product of several centuries of slow change", "It has changed very little since the 1700s", "It remains closed to casual visitors"], correctAnswer: "It is the product of several centuries of slow change" },
      // Group 2: True / False / Not Given
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Cabinets of curiosities were intended primarily for public education.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Ashmolean opened in Oxford in 1683.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Some collectors left their holdings to a university or city on condition they be kept together.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Louvre was the largest royal palace in Europe.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "In the nineteenth century, unaccompanied working people were sometimes refused entry to museums.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Nineteenth-century museums assumed visitors needed no prior knowledge of the exhibits.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Twentieth-century curators began adding written labels to their displays.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most modern museums charge higher entry fees than they did a century ago.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
    ],
  },
  // =====================================================================
  {
    slot: "D",
    title: "The Economics of the Coffee House",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Few commercial spaces have proved as socially influential as the coffee house. Since its arrival in Europe in the seventeenth century, this modest establishment — a room offering a hot drink and somewhere to sit — has repeatedly reshaped patterns of conversation, commerce and information exchange. Its enduring success owes less to the beverage itself than to a particular economic arrangement that the coffee house perfected.

A  The earliest European coffee houses appeared in the trading ports of the eastern Mediterranean and spread quickly to London, Paris and Vienna. What set them apart from taverns was not only the drink they served but their pricing model. For the cost of a single cup, a customer purchased not merely a beverage but effectively a seat, light, warmth and the right to remain for hours. The drink was, in economic terms, a ticket of admission to a shared space.

B  This arrangement had unexpected consequences. Because the price of entry was low and the permitted stay was long, coffee houses attracted customers who came less to drink than to talk, read and conduct business. In London, particular establishments became known for particular trades. One coffee house near the docks specialised in marine news and gradually evolved into a famous insurance market; others became informal stock exchanges or auction rooms. The building supplied the meeting place; the customers supplied the commerce.

C  Coffee houses also functioned as engines of information. Newspapers were expensive, and a single copy could be shared by dozens of readers if it lay on a coffee-house table. Proprietors competed to stock the freshest news-sheets, and customers came specifically to read them. Critics complained that the establishments encouraged idleness and the spreading of rumour, and several governments attempted, without lasting success, to restrict or close them. The attempts failed largely because the coffee house had become too useful to too many people.

D  The economic model was not without strain. A business whose customers paid little and stayed long needed high turnover or additional sources of revenue to survive. Many coffee houses responded by selling food, tobacco and, later, alcohol, or by charging members a subscription. Over time some of the most successful evolved into private clubs, which solved the problem of the lingering non-spending customer by simply excluding the general public altogether.

E  The modern café chain has, in a sense, rediscovered the original formula. It again sells a seat as much as a drink, offering electrical sockets, wireless internet and an unspoken licence to occupy a table for an afternoon. The names and the technology have changed, but the underlying economic bargain — a small payment in exchange for a place to be — is essentially the one struck in the coffee houses of three centuries ago.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "According to the writer, what is the main reason for the coffee house's lasting success?", options: ["The quality of the coffee", "A particular economic arrangement", "Government support", "Its low running costs"], correctAnswer: "A particular economic arrangement" },
      { type: QuestionType.MCQ, prompt: "What did a customer effectively buy along with a cup of coffee?", options: ["A newspaper subscription", "A seat, light, warmth and the right to remain", "Membership of a club", "A share in the business"], correctAnswer: "A seat, light, warmth and the right to remain" },
      { type: QuestionType.MCQ, prompt: "What did one London coffee house near the docks eventually become?", options: ["A private members' club", "A famous insurance market", "A government office", "A newspaper publisher"], correctAnswer: "A famous insurance market" },
      { type: QuestionType.MCQ, prompt: "Why did people come to coffee houses to read newspapers?", options: ["Newspapers were banned elsewhere", "Newspapers were expensive and could be shared", "Coffee houses printed their own papers", "Reading aloud was compulsory"], correctAnswer: "Newspapers were expensive and could be shared" },
      { type: QuestionType.MCQ, prompt: "Why did government attempts to close coffee houses fail?", options: ["The owners were too powerful", "The coffee house had become too useful to too many people", "The drink was considered healthy", "There were no laws against them"], correctAnswer: "The coffee house had become too useful to too many people" },
      { type: QuestionType.MCQ, prompt: "What problem did the coffee-house economic model create?", options: ["Customers paid little and stayed a long time", "The coffee was too expensive to produce", "There were too few customers", "Newspapers were difficult to obtain"], correctAnswer: "Customers paid little and stayed a long time" },
      { type: QuestionType.MCQ, prompt: "How did some successful coffee houses solve the problem of the lingering customer?", options: ["By raising the price of coffee sharply", "By evolving into private clubs that excluded the public", "By limiting opening hours", "By removing all the seating"], correctAnswer: "By evolving into private clubs that excluded the public" },
      { type: QuestionType.MCQ, prompt: "What does the writer say about the modern café chain?", options: ["It has abandoned the original formula", "It has rediscovered the original formula", "It charges far more than early coffee houses", "It discourages customers from staying"], correctAnswer: "It has rediscovered the original formula" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The earliest European coffee houses appeared in eastern Mediterranean trading ports.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Coffee houses charged the same prices as taverns.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "In London, certain coffee houses became associated with particular trades.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Critics praised coffee houses for encouraging hard work.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Some coffee houses charged their members a subscription.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Coffee houses were the first businesses to sell tobacco in Europe.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Modern café chains offer customers wireless internet and electrical sockets.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The basic bargain offered by modern cafés differs completely from that of early coffee houses.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
    ],
  },
  // =====================================================================
  {
    slot: "D",
    title: "Mapping the Ocean Floor",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `For centuries, sailors knew the surface of the sea intimately but had only the vaguest idea of what lay beneath it. The ocean floor, covering most of the planet, remained one of the last great blanks on the map. Charting it required not a single discovery but a series of overlapping techniques developed across nearly two hundred years.

A  The earliest method was the simplest. A weighted rope, or sounding line, was lowered over the side of a ship until it touched the bottom, and the length of rope paid out gave the depth at that one point. The technique was slow and unreliable in deep water, where currents pushed the line sideways and a single measurement might take hours. A famous British expedition of the 1870s spent three and a half years circling the globe and produced only a few hundred deep soundings, yet that scattered handful of points was enough to reveal that the ocean floor was not the flat plain many had assumed.

B  The decisive advance came with sound. In the early twentieth century, engineers realised that a pulse of sound sent downwards would bounce off the sea floor and return as an echo; the time the echo took to arrive revealed the depth. This echo sounding could be carried out while a ship was moving, producing a continuous line of measurements rather than isolated points. By the 1950s, ships criss-crossing the oceans had gathered enough data to draw the first detailed maps, which revealed enormous mountain ranges running for thousands of kilometres along the sea floor.

C  These submarine mountain ranges proved scientifically momentous. Their discovery showed that the sea floor was being created at the ridges and was spreading outwards, a finding that helped confirm the theory of continental drift. A feature first noticed as an obstacle to navigation thus became central evidence for one of the most important ideas in modern geology. The map, in other words, did not merely record the ocean floor; it transformed scientific understanding of how the planet works.

D  Echo sounding from ships, however, could never cover the whole ocean, because vessels follow a limited number of routes. The next leap came from satellites. Although a satellite cannot see the sea floor directly, it can measure the height of the sea surface with extraordinary precision. A large undersea mountain exerts a slightly stronger gravitational pull, drawing water towards it and raising the surface above it by a few metres. By detecting these tiny bulges and dips, satellites can infer the shape of the floor below.

E  Even now the work is incomplete. Satellite measurements reveal large features but miss smaller ones, and the most detailed surveys still rely on ships equipped with modern multibeam instruments that scan a wide strip of sea floor at once. Vast areas have never been examined at high resolution, and international projects continue to coordinate the slow task of filling them in. The map of the ocean floor, begun with a weighted rope, remains a work in progress.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "How did the earliest method of measuring depth work?", options: ["By sending sound pulses downwards", "By lowering a weighted rope until it touched the bottom", "By measuring the sea surface from satellites", "By scanning with multibeam instruments"], correctAnswer: "By lowering a weighted rope until it touched the bottom" },
      { type: QuestionType.MCQ, prompt: "Why was the sounding line unreliable in deep water?", options: ["The rope was too short", "Currents pushed the line sideways", "The bottom was too hard to detect", "Ships could not stay still long enough"], correctAnswer: "Currents pushed the line sideways" },
      { type: QuestionType.MCQ, prompt: "What did the scattered soundings of the 1870s expedition reveal?", options: ["The ocean floor was a flat plain", "The ocean floor was not the flat plain many had assumed", "The ocean was shallower than expected", "Sound travelled faster underwater"], correctAnswer: "The ocean floor was not the flat plain many had assumed" },
      { type: QuestionType.MCQ, prompt: "What was the main advantage of echo sounding over the sounding line?", options: ["It worked only in shallow water", "It could be carried out while a ship was moving", "It needed no equipment", "It produced isolated single points"], correctAnswer: "It could be carried out while a ship was moving" },
      { type: QuestionType.MCQ, prompt: "Why was the discovery of submarine mountain ranges scientifically momentous?", options: ["It helped confirm the theory of continental drift", "It proved the ocean floor was flat", "It improved navigation routes", "It explained ocean currents"], correctAnswer: "It helped confirm the theory of continental drift" },
      { type: QuestionType.MCQ, prompt: "How can a satellite reveal the shape of the ocean floor?", options: ["By photographing the floor directly", "By measuring tiny bulges in the sea surface", "By lowering instruments into the water", "By tracking ships' routes"], correctAnswer: "By measuring tiny bulges in the sea surface" },
      { type: QuestionType.MCQ, prompt: "Why does echo sounding from ships fail to cover the whole ocean?", options: ["Ships follow a limited number of routes", "Sound cannot reach the deepest water", "Ships travel too quickly", "The technique was abandoned in the 1950s"], correctAnswer: "Ships follow a limited number of routes" },
      { type: QuestionType.MCQ, prompt: "What does the writer conclude about the map of the ocean floor?", options: ["It was completed in the 1950s", "It remains a work in progress", "It is no longer needed", "It has been replaced entirely by satellites"], correctAnswer: "It remains a work in progress" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The 1870s British expedition lasted three and a half years.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Echo sounding measures depth using the time taken for an echo to return.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The first detailed maps of the sea floor were drawn before 1900.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Submarine mountain ranges were given names by the scientists who found them.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A large undersea mountain raises the sea surface above it by several metres.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Satellite measurements can detect even the smallest features on the ocean floor.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Modern multibeam instruments scan a wide strip of sea floor at once.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "International projects are working to survey the unexamined areas of the ocean floor.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
    ],
  },
  // =====================================================================
  {
    slot: "D",
    title: "Why People Queue",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Waiting in line is one of the most universal of modern experiences, and also one of the most resented. Researchers who study the psychology of queuing have found that the frustration a queue produces depends only loosely on how long it actually lasts. The way a wait is organised, explained and perceived matters at least as much as its duration, and businesses have learned to exploit this fact.

A  The first principle established by researchers is that unoccupied time feels longer than occupied time. A person standing with nothing to do is acutely aware of every passing minute, whereas the same wait spent reading, listening to music or watching a screen seems noticeably shorter. This is why many airports place mirrors near baggage carousels and why some lifts have screens in their lobbies. The strategy does not shorten the wait; it simply gives the mind something else to attend to.

B  A second principle concerns uncertainty. A wait of a known length is far easier to tolerate than a wait of unknown length, even when the unknown wait turns out to be shorter. A driver told that a delay will last twenty minutes settles into a kind of resignation, while a driver told nothing grows steadily more anxious. For this reason, many transport systems now display estimated waiting times, and the displays often deliberately overstate the figure slightly so that the actual wait feels like a pleasant surprise.

C  Fairness is a third and powerful factor. People will tolerate a long wait far more readily if they believe the queue is just — that those who arrived first are served first. A single instance of someone jumping ahead can provoke anger out of all proportion to the few seconds lost. This explains the popularity of the single combined line that feeds several service points, an arrangement that feels fairer than several separate lines even though it does not necessarily move faster.

D  Perceived value also shapes tolerance. A long wait for something trivial feels insulting, while the same wait for something regarded as worthwhile feels acceptable or even appropriate. Visitors will queue for hours outside a celebrated exhibition without complaint, partly because the very length of the line confirms that the destination is worth reaching. The wait, paradoxically, becomes part of the attraction rather than an obstacle to it.

E  Finally, the emotional tone of the wait depends heavily on its ending. Researchers have found that people judge an experience largely by its final moments, so a queue that ends smoothly and pleasantly is remembered far more kindly than one of identical length that ends in confusion. Sensible organisations therefore invest in the conclusion of the wait — a clear counter, a friendly greeting — knowing that this last impression will colour the customer's memory of the entire episode.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "According to researchers, what does the frustration of a queue depend on?", options: ["Only the actual length of the wait", "Only the time of day", "How the wait is organised and perceived", "The number of people in the queue"], correctAnswer: "How the wait is organised and perceived" },
      { type: QuestionType.MCQ, prompt: "Why do some airports place mirrors near baggage carousels?", options: ["To make the area look larger", "To give waiting minds something else to attend to", "To help staff monitor the crowd", "To reflect more light into the hall"], correctAnswer: "To give waiting minds something else to attend to" },
      { type: QuestionType.MCQ, prompt: "What does research say about a wait of unknown length?", options: ["It always feels shorter than a known wait", "It is harder to tolerate than a known wait", "It causes no anxiety", "It is preferred by most travellers"], correctAnswer: "It is harder to tolerate than a known wait" },
      { type: QuestionType.MCQ, prompt: "Why do estimated waiting-time displays often overstate the figure slightly?", options: ["So the actual wait feels like a pleasant surprise", "Because the estimates cannot be calculated precisely", "To discourage people from waiting", "To comply with transport regulations"], correctAnswer: "So the actual wait feels like a pleasant surprise" },
      { type: QuestionType.MCQ, prompt: "Why is a single combined line popular?", options: ["It always moves faster than separate lines", "It feels fairer than several separate lines", "It requires fewer staff", "It takes up less space"], correctAnswer: "It feels fairer than several separate lines" },
      { type: QuestionType.MCQ, prompt: "What can make a long wait for something feel acceptable?", options: ["The destination being regarded as worthwhile", "The presence of comfortable seating", "A short distance to the entrance", "The absence of other people"], correctAnswer: "The destination being regarded as worthwhile" },
      { type: QuestionType.MCQ, prompt: "Why can the length of a queue become part of an attraction?", options: ["It allows visitors to rest", "It confirms that the destination is worth reaching", "It reduces ticket prices", "It speeds up the service inside"], correctAnswer: "It confirms that the destination is worth reaching" },
      { type: QuestionType.MCQ, prompt: "Why do sensible organisations invest in the ending of a wait?", options: ["The ending is the cheapest part to improve", "People judge an experience largely by its final moments", "Customers rarely notice the ending", "Regulations require a clear exit"], correctAnswer: "People judge an experience largely by its final moments" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Unoccupied time feels longer than occupied time.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Placing screens in lift lobbies makes the actual wait shorter.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A driver told the length of a delay tends to feel more resigned than anxious.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Someone jumping a queue can cause anger out of proportion to the time lost.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Single combined lines always move faster than separate lines.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most visitors to celebrated exhibitions complain about the length of the queue.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Researchers studied queues at sporting events in particular.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A queue that ends pleasantly is remembered more kindly than one of equal length that ends in confusion.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
    ],
  },
  // =====================================================================
  {
    slot: "D",
    title: "The Rediscovery of Natural Dyes",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `For thousands of years, every colour worn by human beings came from a plant, an animal or a mineral. The arrival of synthetic dyes in the nineteenth century swept these natural sources almost entirely aside within a single generation. In recent decades, however, natural dyes have begun a modest but real return, driven by a combination of environmental concern and renewed craft interest.

A  Traditional dyeing was a demanding craft. A dyer needed not only the colouring material itself but a deep knowledge of how to fix it permanently to cloth. Most natural dyes will not bond to fibre on their own; they require a mordant, usually a metallic salt, which acts as a bridge between dye and fabric. The same dye combined with different mordants could yield strikingly different shades, so a single plant might produce a whole range of colours in skilled hands. This complexity made master dyers valued and sometimes secretive specialists.

B  Certain colours carried great economic and social weight. A deep purple obtained from a Mediterranean sea snail was so laborious to produce — thousands of snails for a few grams of dye — that it became a marker of imperial rank, forbidden to ordinary citizens in some societies. A brilliant red came from a small insect harvested in the Americas and was, for a time, among the most valuable goods crossing the Atlantic. Colour, in these cases, was not decoration but currency and status.

C  The transformation came in 1856, when a young British chemist searching for an anti-malarial drug accidentally produced a vivid purple compound from coal tar. This first synthetic dye, and the many that followed, were cheaper, more consistent and available in shades that no plant could match. Within a few decades the great natural-dye industries had collapsed, and the elaborate knowledge that supported them was largely forgotten.

D  The recent revival has several roots. Some textile producers have grown uneasy about the environmental cost of synthetic dyeing, which can release large quantities of contaminated water. Others are responding to consumers who associate natural dyes with craftsmanship and authenticity and are willing to pay more for garments coloured in this way. Museums and conservators have also driven research, because understanding historical dyes is essential to preserving old textiles correctly.

E  Natural dyes are unlikely ever to replace synthetic ones on an industrial scale. They are more expensive, harder to reproduce exactly, and some require mordants that carry their own environmental drawbacks. Yet they have secured a durable niche. Small workshops, heritage projects and parts of the fashion industry now use them deliberately, valuing precisely the variability and connection to tradition that once made them seem hopelessly outdated.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "Where did all human colours come from for thousands of years?", options: ["Coal tar", "Plants, animals or minerals", "Synthetic laboratories", "Imported chemicals"], correctAnswer: "Plants, animals or minerals" },
      { type: QuestionType.MCQ, prompt: "What is the function of a mordant?", options: ["To brighten the colour of cloth", "To act as a bridge between dye and fabric", "To remove dye from old textiles", "To replace the dye entirely"], correctAnswer: "To act as a bridge between dye and fabric" },
      { type: QuestionType.MCQ, prompt: "Why could a single plant produce a range of colours?", options: ["It contained several different dyes", "Different mordants yielded different shades", "It was grown in different climates", "It was harvested at different times"], correctAnswer: "Different mordants yielded different shades" },
      { type: QuestionType.MCQ, prompt: "Why did a deep purple dye become a marker of imperial rank?", options: ["It faded very quickly", "It was extremely laborious to produce", "It could only be made in winter", "It was easy for anyone to obtain"], correctAnswer: "It was extremely laborious to produce" },
      { type: QuestionType.MCQ, prompt: "How was the first synthetic dye produced?", options: ["By extracting colour from a sea snail", "Accidentally, while searching for an anti-malarial drug", "By combining several natural dyes", "By a deliberate government research programme"], correctAnswer: "Accidentally, while searching for an anti-malarial drug" },
      { type: QuestionType.MCQ, prompt: "What happened to natural-dye industries after synthetic dyes appeared?", options: ["They expanded rapidly", "They collapsed within a few decades", "They remained unchanged", "They moved to the Americas"], correctAnswer: "They collapsed within a few decades" },
      { type: QuestionType.MCQ, prompt: "Why have museums and conservators driven research into natural dyes?", options: ["To produce dyes more cheaply", "Because understanding historical dyes helps preserve old textiles", "To compete with the fashion industry", "To replace synthetic dyes entirely"], correctAnswer: "Because understanding historical dyes helps preserve old textiles" },
      { type: QuestionType.MCQ, prompt: "What does the writer conclude about natural dyes today?", options: ["They will soon replace synthetic dyes", "They have secured a durable niche", "They have disappeared again", "They are now banned in fashion"], correctAnswer: "They have secured a durable niche" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most natural dyes will bond to fibre without any additional substance.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Master dyers were sometimes secretive about their methods.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A brilliant red dye came from an insect harvested in the Americas.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The first synthetic dye was produced in 1856.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Synthetic dyes were more expensive than natural dyes.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Synthetic dyeing can release large quantities of contaminated water.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Garments coloured with natural dyes are usually cheaper than synthetically dyed ones.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Some mordants used in natural dyeing have environmental drawbacks of their own.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
    ],
  },
  // =====================================================================
  {
    slot: "D",
    title: "The Long Search for the Northwest Passage",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `For more than four centuries, European navigators sought a sea route through the Arctic that would connect the Atlantic and Pacific oceans across the top of North America. The Northwest Passage, as the hoped-for route was called, promised a dramatic shortcut to the markets of Asia. The history of the search is a study in persistence, miscalculation and the slow accumulation of geographical knowledge.

A  The motivation was commercial. By the sixteenth century, European powers were trading with Asia by long voyages around the southern tips of Africa or South America. A northern passage, if it existed, would shorten the journey enormously and free a nation from dependence on routes controlled by rivals. Successive expeditions were therefore funded by governments and merchant companies hoping for a competitive advantage rather than by curiosity alone.

B  The early searches were defeated by a basic misunderstanding of the Arctic. Navigators assumed that, once they passed beyond the ice they could see, open water would lie ahead, much as it did at lower latitudes. In reality the Arctic Ocean is choked with drifting pack ice that shifts unpredictably with wind and current. A channel that was open one year might be sealed solid the next, so a route discovered by one expedition could not be relied upon by the next.

C  The most famous attempt ended in catastrophe. In the mid-nineteenth century a well-equipped British expedition of two ships and well over a hundred men sailed into the Arctic and never returned. The disappearance prompted a search effort that lasted years and involved dozens of vessels. Although the missing crews were never rescued, the searchers themselves charted vast stretches of previously unknown coastline, so the disaster paradoxically advanced the very geographical knowledge the original voyage had sought.

D  Success, when it finally came, was modest rather than triumphant. In the first decade of the twentieth century a small Norwegian expedition in a single shallow-draught vessel completed the passage for the first time, but the voyage took three years, much of it spent frozen in place waiting for the ice to release the ship. The route proved far too slow, shallow and dangerous to be of any commercial use, and the centuries-old dream of a profitable shortcut quietly evaporated.

E  In recent years the passage has returned to the news for an unexpected reason. As Arctic sea ice retreats, the route is open for longer periods each summer, and commercial vessels have begun, cautiously, to use it. The shortcut that generations of navigators died trying to find may finally become practical — not through any feat of seamanship, but as an unintended consequence of a warming climate.`,
    questions: [
      { type: QuestionType.MCQ, prompt: "What did the Northwest Passage promise European navigators?", options: ["A safe harbour in the Arctic", "A dramatic shortcut to the markets of Asia", "A source of fresh water", "New fishing grounds"], correctAnswer: "A dramatic shortcut to the markets of Asia" },
      { type: QuestionType.MCQ, prompt: "Who mainly funded the expeditions to find the passage?", options: ["Independent explorers", "Governments and merchant companies", "Religious organisations", "Scientific academies"], correctAnswer: "Governments and merchant companies" },
      { type: QuestionType.MCQ, prompt: "What basic misunderstanding defeated the early searches?", options: ["That the Arctic contained no land", "That open water would lie beyond the visible ice", "That the passage did not exist at all", "That Asia could not be reached by sea"], correctAnswer: "That open water would lie beyond the visible ice" },
      { type: QuestionType.MCQ, prompt: "Why could a route found by one expedition not be relied on by the next?", options: ["The maps were always lost", "Pack ice shifts unpredictably with wind and current", "Each expedition took a different ocean", "The route was kept secret"], correctAnswer: "Pack ice shifts unpredictably with wind and current" },
      { type: QuestionType.MCQ, prompt: "What was the paradoxical result of the mid-nineteenth-century disaster?", options: ["It ended all interest in the passage", "The search effort charted vast stretches of unknown coastline", "It proved the passage did not exist", "It rescued the missing crews years later"], correctAnswer: "The search effort charted vast stretches of unknown coastline" },
      { type: QuestionType.MCQ, prompt: "How long did the first successful crossing of the passage take?", options: ["A single summer", "Three years", "Over a decade", "Several months"], correctAnswer: "Three years" },
      { type: QuestionType.MCQ, prompt: "Why did the centuries-old dream of a profitable shortcut evaporate?", options: ["The route proved too slow, shallow and dangerous for commercial use", "Asia was no longer worth trading with", "The passage was found not to exist", "Other shortcuts were discovered"], correctAnswer: "The route proved too slow, shallow and dangerous for commercial use" },
      { type: QuestionType.MCQ, prompt: "Why has the passage returned to the news in recent years?", options: ["A new expedition has been lost there", "Retreating sea ice keeps the route open for longer each summer", "It has been declared a protected area", "A faster ship design has been invented"], correctAnswer: "Retreating sea ice keeps the route open for longer each summer" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "European powers traded with Asia by sailing around the southern tips of Africa or South America.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Arctic Ocean is largely free of drifting pack ice.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The mid-nineteenth-century British expedition consisted of two ships.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The missing crews of the British expedition were eventually rescued.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The first successful crossing was made by a small Norwegian expedition.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Norwegian vessel that first completed the passage was a large deep-draught ship.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The Norwegian expedition received a financial reward for completing the passage.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Commercial vessels have begun to use the passage in recent years.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
    ],
  },
];
