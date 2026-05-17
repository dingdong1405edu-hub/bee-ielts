import { CEFRLevel, QuestionType } from "@prisma/client";
import type { ReadingDataV2 } from "./reading-v2";

/**
 * Reading bank v3 — slot C only.
 * 6 paragraph-labeled IELTS Academic passages, each with EXACTLY 2 question
 * groups: MATCHING_INFO (which paragraph contains...) + FILL_BLANK (sentence
 * completion). Total 14-16 questions per passage.
 *
 * Topics drawn from history, archaeology, society and economics.
 */
export const READING_V3_C: ReadingDataV2[] = [
  // =====================================================================
  {
    slot: "C",
    title: "The Lost Library of Alexandria",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Few institutions of the ancient world have captured the modern imagination quite like the Library of Alexandria. Founded in Egypt during the third century BCE, it has come to stand for a golden age of learning — and, in its eventual disappearance, for the fragility of human knowledge. Yet the popular image of a single great fire destroying centuries of wisdom in a night is, scholars now agree, almost entirely a myth.

A  The library was established under the early Ptolemaic kings, the Greek dynasty that ruled Egypt after the death of Alexander the Great. It formed part of a larger research institution known as the Mouseion, where salaried scholars lived, ate and worked at royal expense. The rulers pursued an aggressive acquisitions policy: ships docking at the harbour were searched for books, which were copied before the originals — or sometimes the copies — were returned to their owners.

B  Estimates of the collection vary enormously. Ancient writers spoke of figures ranging from forty thousand to seven hundred thousand scrolls, but these numbers are unreliable, and a single work might be spread across many scrolls. What is clear is that the library aimed at comprehensiveness. Its scholars did not merely store texts; they compared different versions, corrected errors and produced authoritative editions of authors such as Homer that influenced how those works were read for centuries.

C  The achievements of the Mouseion were considerable. It was here that the geographer Eratosthenes calculated the circumference of the Earth with remarkable accuracy, and that the foundations of systematic grammar, anatomy and astronomy were laid. The library functioned, in effect, as the first state-funded research centre, drawing talented individuals from across the Mediterranean to a single city.

D  The decline of the library was gradual rather than sudden. A serious fire did occur in 48 BCE, when Julius Caesar, besieged in the city, ordered ships in the harbour set alight; the flames spread to warehouses near the docks. But contemporary accounts suggest the main collection survived, and the institution continued to function for generations afterwards. Later episodes of civil unrest, the withdrawal of royal funding and the steady departure of scholars all played their part.

E  Religious and political conflict in the later Roman period caused further losses. The destruction of a daughter library housed in a temple, and the murder of the mathematician Hypatia in the early fifth century CE, are often cited as symbolic end-points. Yet by this date the collection had already been depleted for centuries. No single event, and no single villain, can be held responsible.

F  Perhaps the most important lesson of Alexandria is not about fire at all. Papyrus, the material on which the scrolls were written, decays within a few centuries unless constantly recopied. A library is therefore only as permanent as the effort devoted to maintaining it. The true cause of the loss was less a catastrophe than the slow ending of the institutional will to preserve.`,
    questions: [
      // Group 1: Matching Information (which paragraph contains...)
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the searching of ships for books to copy.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "An argument that the real cause of the loss was a failure to maintain the collection.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "A statement that figures for the size of the collection cannot be trusted.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of a fire caused by a military leader during a siege.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "An example of a scientific measurement made by a scholar at the institution.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A claim that no single person can be blamed for the library's end.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of scholars correcting texts and producing reliable editions.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the dynasty that founded the library.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      // Group 2: Sentence Completion — NO MORE THAN THREE WORDS
      { type: QuestionType.FILL_BLANK, prompt: "The library was part of a larger research institution called the ___.", correctAnswer: "Mouseion" },
      { type: QuestionType.FILL_BLANK, prompt: "The geographer Eratosthenes calculated the ___ of the Earth.", correctAnswer: "circumference" },
      { type: QuestionType.FILL_BLANK, prompt: "A serious fire occurred in 48 BCE during a siege led by Julius ___.", correctAnswer: "Caesar" },
      { type: QuestionType.FILL_BLANK, prompt: "The murder of the mathematician ___ in the early fifth century is often treated as a symbolic end-point.", correctAnswer: "Hypatia" },
      { type: QuestionType.FILL_BLANK, prompt: "The scrolls were written on ___, a material that decays within a few centuries.", correctAnswer: "papyrus" },
      { type: QuestionType.FILL_BLANK, prompt: "Scholars at the library produced authoritative editions of authors such as ___.", correctAnswer: "Homer" },
      { type: QuestionType.FILL_BLANK, prompt: "The library was established by the early ___ kings who ruled Egypt.", correctAnswer: "Ptolemaic" },
    ],
  },
  {
    slot: "C",
    title: "The Rise and Fall of the Hanseatic League",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Long before the European Union, a different kind of commercial alliance bound together the towns of northern Europe. The Hanseatic League — a loose confederation of trading cities active from roughly the thirteenth to the seventeenth century — controlled much of the commerce of the Baltic and North Sea regions. It possessed no fixed capital, no standing army and no written constitution, yet for three centuries it was a power that kings could not afford to ignore.

A  The League grew out of practical necessity. Medieval merchants travelling between distant towns faced piracy, unpredictable tolls and unfamiliar legal systems. By banding together, traders from cities such as Lübeck, Hamburg and Bremen could negotiate as a group, share the cost of protection and insist on common commercial rules. What began as informal cooperation between individual merchants gradually hardened into an association of towns.

B  At its height the League linked nearly two hundred settlements, from the Low Countries in the west to the Russian city of Novgorod in the east. It established fortified trading posts, known as kontors, in foreign cities including London, Bruges and Bergen. Within these enclaves the merchants lived under their own laws, stored their goods and enjoyed privileges that local rulers had granted in exchange for the wealth that Hanseatic trade brought.

C  The goods that moved through this network were rarely luxuries. The League dealt above all in bulk necessities: grain from the Baltic plains, timber and tar for shipbuilding, salted herring, wax, furs and cloth. Its commercial genius lay in organising the reliable, large-scale transport of ordinary commodities — connecting regions that produced a surplus of one good with regions that lacked it.

D  Decision-making was conducted through an irregular assembly called the Diet, to which member towns sent representatives. But attendance was voluntary, resolutions were difficult to enforce, and the interests of a port like Lübeck often diverged sharply from those of an inland cloth town. This looseness was both a strength and a weakness: it allowed the League to adapt, but left it unable to act decisively in a crisis.

E  The decline of the League had several causes. The rise of strong centralised states — England, the Netherlands, the kingdoms of Scandinavia — meant that monarchs increasingly favoured their own merchants and revoked Hanseatic privileges. The opening of Atlantic trade routes shifted the centre of European commerce away from the Baltic. And the League's refusal to develop shared finances or a permanent fleet left it poorly equipped to compete.

F  By the time the last formal Diet met in 1669, only a handful of towns still bothered to send delegates. Yet the League left a lasting mark. It spread a common commercial law across the region, helped standardise weights and measures, and demonstrated that cooperation between cities could generate prosperity without the backing of a single sovereign — an idea that would resurface, in very different forms, in later centuries.`,
    questions: [
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the kinds of everyday goods the League traded.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of the dangers that first drove merchants to cooperate.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of fortified foreign trading posts where merchants lived under their own laws.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A statement that the League's loose structure was both an advantage and a drawback.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the lasting influence the League had on commercial law.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of how the growth of powerful states harmed the League.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the geographical extent of the League's network.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to how the shift of trade to the Atlantic weakened the League.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.FILL_BLANK, prompt: "The League's foreign trading posts were known as ___.", correctAnswer: "kontors" },
      { type: QuestionType.FILL_BLANK, prompt: "Decisions were made through an irregular assembly called the ___.", correctAnswer: "Diet" },
      { type: QuestionType.FILL_BLANK, prompt: "At its height the League linked nearly two hundred ___.", correctAnswer: "settlements" },
      { type: QuestionType.FILL_BLANK, prompt: "In the east, the League's network reached the Russian city of ___.", correctAnswer: "Novgorod" },
      { type: QuestionType.FILL_BLANK, prompt: "The last formal Diet of the League met in the year ___.", correctAnswer: "1669" },
      { type: QuestionType.FILL_BLANK, prompt: "One of the founding cities of the League, alongside Hamburg and Bremen, was ___.", correctAnswer: "Lübeck" },
    ],
  },
  {
    slot: "C",
    title: "Reading the Past Through Tree Rings",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Every year a tree adds a new layer of wood beneath its bark, and every layer records something of the world in which it grew. The study of these annual rings, known as dendrochronology, has become one of the most precise tools available to historians and archaeologists. It can date a wooden beam to a single year, reconstruct ancient climates, and occasionally settle disputes that documents alone could never resolve.

A  The basic principle is simple. In most temperate regions a tree produces one ring per year: a band of pale, fast-grown wood in spring followed by darker, denser wood later in the season. The width of each ring depends on growing conditions. A warm, wet year produces a broad ring; a cold or dry year produces a narrow one. Over a tree's lifetime, these varying widths form a distinctive sequence, almost like a barcode.

B  The key insight, developed in the early twentieth century by the American astronomer Andrew Douglass, was that this barcode is shared. Trees of the same species growing in the same region experience the same weather, and therefore display the same pattern of wide and narrow rings. By matching the outer rings of an old living tree with the inner rings of a still older piece of dead timber, researchers can build a continuous record stretching back thousands of years.

C  This technique of overlapping samples is called cross-dating, and it allows a piece of wood of unknown age to be slotted into the master sequence. Once a match is found, the year in which every ring formed — and therefore the year the tree was felled — can be read directly. In parts of Europe, unbroken oak chronologies now extend back more than ten thousand years.

D  For archaeology the implications are profound. A timber from a buried building, a ship or a wooden tool can be dated far more accurately than radiocarbon analysis allows. Tree-ring dating has been used to establish when prehistoric lake villages were built, to expose forged paintings whose wooden panels were too young for the supposed artist, and to confirm the age of historic structures across the world.

E  Tree rings also preserve a climate archive. Unusually narrow rings appearing in the same year across a wide region point to a season of severe cold or drought. Scientists have linked such rings to the aftermath of major volcanic eruptions, whose dust clouds dimmed the sun and chilled the atmosphere. In this way a row of stunted rings can corroborate, or even uncover, a disaster recorded only faintly in human history.

F  The method has limits. Trees from tropical regions, where the seasons are weak, often fail to produce clear annual rings. Wood that has rotted, burned or been cut into small pieces may not preserve enough rings to date. And every regional chronology must be painstakingly assembled before any sample from that area can be dated at all. Even so, the humble tree ring remains one of the few natural records that can be read year by year.`,
    questions: [
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the use of tree rings to detect art forgeries.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of why ring width varies from year to year.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of the conditions under which the method does not work well.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to a scientist who realised that ring patterns are shared between trees.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of how rings can reveal the effects of volcanic eruptions.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of how overlapping samples extend the dated record.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A comparison between tree-ring dating and radiocarbon analysis.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "A comparison of the ring sequence to a familiar identifying pattern.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.FILL_BLANK, prompt: "The study of annual tree rings is known as ___.", correctAnswer: "dendrochronology" },
      { type: QuestionType.FILL_BLANK, prompt: "The American astronomer Andrew ___ realised that ring patterns are shared by trees.", correctAnswer: "Douglass" },
      { type: QuestionType.FILL_BLANK, prompt: "The technique of overlapping wood samples of different ages is called ___.", correctAnswer: "cross-dating" },
      { type: QuestionType.FILL_BLANK, prompt: "In parts of Europe, unbroken ___ chronologies extend back more than ten thousand years.", correctAnswer: "oak" },
      { type: QuestionType.FILL_BLANK, prompt: "Unusually narrow rings have been linked to the aftermath of major ___ eruptions.", correctAnswer: "volcanic" },
      { type: QuestionType.FILL_BLANK, prompt: "Trees from ___ regions often fail to produce clear annual rings.", correctAnswer: "tropical" },
    ],
  },
  {
    slot: "C",
    title: "The Origins of Paper Money",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `For most of human history, money meant metal — coins of gold, silver or bronze whose value lay in the substance itself. The idea that a slip of paper, worthless in its own right, could serve as money seemed for centuries either absurd or dangerous. Yet paper currency is now used everywhere on Earth, and its long, uneven history reveals as much about trust as it does about economics.

A  The first true paper money appeared in China. Under the Tang dynasty, merchants weary of transporting heavy strings of copper coins began depositing them with trusted agents, who issued receipts that could be redeemed elsewhere. By the time of the Song dynasty in the eleventh century, the government had taken over the practice, printing standardised notes that circulated as official currency. These early Chinese notes were the first banknotes anywhere in the world.

B  The system carried a hidden danger. Because the notes cost almost nothing to produce, governments under financial pressure were tempted to print more of them than they could back. When too many notes chased too few goods, their value collapsed. Several Chinese dynasties experienced severe inflation for exactly this reason, and at one point the practice of issuing paper money was abandoned altogether for several centuries.

C  Europe came to paper money far later and by a different route. From the seventeenth century, goldsmiths in cities such as London held customers' precious metal for safekeeping and issued written receipts. People discovered that it was simpler to hand over the receipt than to withdraw the gold, and the receipts themselves began to circulate. Out of this practice grew the private banknote, and eventually the modern bank.

D  The first European experiment in state paper money ended in disaster. In early eighteenth-century France, the financier John Law persuaded the government to issue paper currency backed by shares in a trading company. For a time the scheme generated enormous wealth on paper, but confidence evaporated, the company's value crashed, and thousands of investors were ruined. The episode left the French deeply suspicious of paper money for generations.

E  What made paper currency workable in the long run was the gradual building of institutions. Central banks, established to manage the issue of notes, could limit how much was printed and stand ready to exchange notes for metal on demand. A banknote backed by such an institution, and by law, came to be trusted in a way that earlier private or speculative notes never were.

F  The final step was the abandonment of metal backing altogether. Through the twentieth century, country after country ended the right to exchange notes for gold, leaving currencies whose value rests purely on confidence and on the policies of the issuing authority. Such money is called fiat currency. It works only because nearly everyone agrees that it does — a collective act of trust that the inventors of the first Chinese notes would have found remarkable.`,
    questions: [
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to a failed scheme that made the French distrust paper money.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of how over-printing of notes caused prices to rise.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of how goldsmiths' receipts began to circulate as money.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to currency whose value depends only on confidence.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of why merchants first preferred receipts to carrying coins.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of the role of central banks in making notes trustworthy.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to a government taking over the printing of notes.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A statement that paper money was once abandoned for several centuries.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.FILL_BLANK, prompt: "The first true paper money appeared in ___.", correctAnswer: "China" },
      { type: QuestionType.FILL_BLANK, prompt: "Standardised government notes were first printed under the ___ dynasty.", correctAnswer: "Song" },
      { type: QuestionType.FILL_BLANK, prompt: "In Europe, written receipts were first issued by ___ who held customers' precious metal.", correctAnswer: "goldsmiths" },
      { type: QuestionType.FILL_BLANK, prompt: "The disastrous French paper-money scheme was promoted by the financier John ___.", correctAnswer: "Law" },
      { type: QuestionType.FILL_BLANK, prompt: "Institutions set up to manage the issue of notes are called ___ banks.", correctAnswer: "central" },
      { type: QuestionType.FILL_BLANK, prompt: "Money whose value rests purely on confidence is called ___ currency.", correctAnswer: "fiat" },
    ],
  },
  {
    slot: "C",
    title: "The Discovery of Pompeii",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `In 79 CE the Roman town of Pompeii, together with its neighbour Herculaneum, was buried beneath the ash and debris of a violent eruption of Mount Vesuvius. For nearly seventeen centuries the town lay forgotten beneath farmland. Its rediscovery, beginning in the eighteenth century, would transform the way Europeans understood the ancient world and lay the foundations of modern archaeology.

A  The first organised excavations were not motivated by scholarship. In the 1730s the king of Naples authorised tunnelling into the buried sites largely in search of statues and other valuable objects to decorate his palaces. Workers dug haphazard shafts, removed anything that looked saleable, and frequently destroyed walls and paintings that stood in their way. The early work produced a stream of treasures but left almost no record of where each object had been found.

B  Attitudes changed slowly over the following century. Excavators began to clear whole streets rather than dig isolated tunnels, and to leave finds in place so that buildings could be studied as a whole. By the mid-nineteenth century, under the direction of the archaeologist Giuseppe Fiorelli, the site was divided into a numbered grid, finds were catalogued, and a proper journal of each day's discoveries was kept. Pompeii became, in effect, a training ground for the new discipline of archaeology.

C  Fiorelli is best remembered for an ingenious technique. The bodies of those who died in the eruption had decayed, leaving hollow cavities in the hardened ash. By pouring liquid plaster into these voids and then chipping away the surrounding material, his team produced casts that captured the victims in their final moments — a discovery that gave the ruined town a sudden and unsettling human presence.

D  What makes Pompeii so valuable is its completeness. Most ancient sites were abandoned gradually, their useful materials carried away and their buildings left to crumble. Pompeii, by contrast, was frozen in a single day. Loaves of bread remained in ovens, election notices were still painted on walls, and the contents of shops and kitchens lay where their owners had left them. The town offers a cross-section of ordinary Roman life unmatched anywhere else.

E  The site has not always been well treated. Two centuries of excavation, wartime bombing, mass tourism and inadequate funding left many structures exposed to rain and decay. Several houses collapsed in the early twenty-first century, prompting an international outcry and a large conservation programme. The challenge is now less one of digging than of preserving what has already been uncovered.

F  Modern archaeologists have therefore changed their approach. Large areas of Pompeii remain deliberately unexcavated, on the principle that future methods will extract more information than present ones can. Where digging does take place, it is slow and meticulous, recording soil layers, plant remains and tiny fragments that earlier generations would have swept aside. The town that was once plundered for statues is now studied for what its rubbish heaps can reveal.`,
    questions: [
      { type: QuestionType.MATCHING_INFO, prompt: "A description of how casts of the eruption's victims were created.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to early digging that was driven by a search for valuable objects.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of why much of the site is intentionally left undug.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the collapse of buildings in recent times.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of why the town gives an unusually complete picture of Roman life.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of the introduction of a numbered grid and proper record-keeping.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the destruction of walls and paintings during early excavation.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A statement that everyday items were found exactly where their owners left them.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.FILL_BLANK, prompt: "Pompeii was buried in 79 CE by an eruption of Mount ___.", correctAnswer: "Vesuvius" },
      { type: QuestionType.FILL_BLANK, prompt: "The first organised excavations in the 1730s were authorised by the king of ___.", correctAnswer: "Naples" },
      { type: QuestionType.FILL_BLANK, prompt: "The site was divided into a numbered grid under the archaeologist Giuseppe ___.", correctAnswer: "Fiorelli" },
      { type: QuestionType.FILL_BLANK, prompt: "Casts of the victims were made by pouring liquid ___ into hollow cavities in the ash.", correctAnswer: "plaster" },
      { type: QuestionType.FILL_BLANK, prompt: "Pompeii's neighbouring town, also buried by the eruption, was ___.", correctAnswer: "Herculaneum" },
      { type: QuestionType.FILL_BLANK, prompt: "The main challenge at the site today is one of ___ rather than digging.", correctAnswer: "preserving" },
    ],
  },
  {
    slot: "C",
    title: "How the Spice Trade Shaped the World",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `It is easy today to think of pepper, cinnamon and cloves as ordinary kitchen ingredients. For most of recorded history, however, spices were among the most valuable commodities on Earth, and the desire to control their trade reshaped empires, financed exploration and connected distant continents in ways that still echo today.

A  The earliest spice routes were overland. For centuries, cloves and nutmeg from a small group of islands in eastern Indonesia, and pepper from the coast of India, passed through the hands of many intermediaries before reaching the Mediterranean. Each merchant along the way added a margin, so that by the time a sack of pepper arrived in a European market it might cost many times its original price. The producers themselves often had no idea of the wealth their crops generated.

B  Spices were prized for several reasons beyond flavour. In an age before refrigeration they helped disguise the taste of food that was no longer fresh, though this is sometimes exaggerated, since only the rich could afford spices in the first place. They were also believed to have medicinal value, were burned as incense in religious ceremonies, and served above all as a visible mark of wealth and status at the tables of the powerful.

C  Control of the trade brought immense profit, and from the late fifteenth century European states competed fiercely for it. Portuguese navigators sought a sea route around Africa to reach the source of the spices directly, bypassing the overland middlemen. The arrival of Portuguese ships in the Indian Ocean broke a trading system that had operated for over a thousand years.

D  The most ruthless competition centred on a tiny cluster of islands. The Banda Islands were, at the time, the world's only source of nutmeg. In the seventeenth century the Dutch East India Company fought to monopolise this trade, and its methods were brutal: the islands' population was largely destroyed or enslaved, and plantations were placed under direct company control. For a time, nutmeg was worth more by weight than gold.

E  The economic effects of the spice trade extended far beyond the spices themselves. The need to finance long, risky voyages encouraged the development of new commercial institutions, including joint-stock companies in which many investors shared both the costs and the profits. Port cities such as Lisbon, Amsterdam and London grew wealthy as the trade's European terminals.

F  In the end the spice monopolies could not last. Seeds and seedlings were smuggled out and planted in new colonies, so that nutmeg, cloves and pepper came to be grown in many tropical regions. As supply increased, prices fell, and spices gradually became affordable to ordinary households. The commodities that had once driven empires to war settled quietly into the everyday kitchen cupboard.`,
    questions: [
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to how the smuggling of seeds ended the spice monopolies.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "F" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of how many intermediaries raised the price of spices.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to violent methods used to monopolise the nutmeg trade.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "D" },
      { type: QuestionType.MATCHING_INFO, prompt: "An explanation of reasons people valued spices apart from their taste.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "B" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to the growth of new ways of financing risky voyages.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.MATCHING_INFO, prompt: "A description of a sea route that bypassed overland traders.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "C" },
      { type: QuestionType.MATCHING_INFO, prompt: "A statement that spice producers were often unaware of how valuable their crops were.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "A" },
      { type: QuestionType.MATCHING_INFO, prompt: "A reference to European port cities that prospered from the trade.", options: ["A", "B", "C", "D", "E", "F"], correctAnswer: "E" },
      { type: QuestionType.FILL_BLANK, prompt: "Before refrigeration, spices helped disguise the taste of food that was no longer ___.", correctAnswer: "fresh" },
      { type: QuestionType.FILL_BLANK, prompt: "Portuguese navigators sought a sea route around ___ to reach the spices directly.", correctAnswer: "Africa" },
      { type: QuestionType.FILL_BLANK, prompt: "The Banda Islands were at the time the world's only source of ___.", correctAnswer: "nutmeg" },
      { type: QuestionType.FILL_BLANK, prompt: "The brutal monopoly over nutmeg was enforced by the ___ East India Company.", correctAnswer: "Dutch" },
      { type: QuestionType.FILL_BLANK, prompt: "Long, risky voyages were financed through new ___ companies in which many investors shared the costs.", correctAnswer: "joint-stock" },
      { type: QuestionType.FILL_BLANK, prompt: "As the supply of spices increased, their ___ fell.", correctAnswer: "prices" },
    ],
  },
];
