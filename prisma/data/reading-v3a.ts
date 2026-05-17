import { CEFRLevel, QuestionType } from "@prisma/client";
import type { ReadingDataV2 } from "./reading-v2";

/**
 * Reading bank v3 — slot A only. Six original IELTS Academic passages on
 * natural science, biology, the environment and the human body.
 *
 * Each passage has EXACTLY 2 question groups:
 *   Group 1: MATCHING_HEADINGS (one per labelled paragraph A–F)
 *   Group 2: TRUE_FALSE_NOT_GIVEN
 * Total 14-16 questions per passage.
 */

// Shared options for Matching Headings (reused inside each passage)
const B1_HEADINGS = [
  "i. A defence built from chemicals",
  "ii. The cost of sending warnings",
  "iii. How a silent alarm travels",
  "iv. Insects that ignore the signal",
  "v. An early experiment that raised doubts",
  "vi. Trees that share through their roots",
  "vii. Why scientists once dismissed the idea",
  "viii. Limits of the warning system",
  "ix. Lessons for managing forests",
];

const B2_HEADINGS = [
  "i. A journey shaped by the seasons",
  "ii. Navigating without a map",
  "iii. The energy demands of long flight",
  "iv. Threats along the route",
  "v. How tracking changed the science",
  "vi. Birds that no longer migrate",
  "vii. A puzzle of timing and food",
  "viii. The first records of the phenomenon",
  "ix. Conservation across many borders",
];

const B3_HEADINGS = [
  "i. A community living inside us",
  "ii. The influence of early childhood",
  "iii. How diet reshapes the population",
  "iv. A link to the brain",
  "v. Caution about exaggerated claims",
  "vi. Damage caused by overusing medicines",
  "vii. The discovery of unseen residents",
  "viii. Differences between individuals",
  "ix. Possible medical treatments",
];

const B4_HEADINGS = [
  "i. Reefs as shelter for many species",
  "ii. The slow construction of a reef",
  "iii. A partnership under stress",
  "iv. Damage from distant pollution",
  "v. Signs of recovery in protected zones",
  "vi. Why warm water turns coral white",
  "vii. The economic value of healthy reefs",
  "viii. Coral that survives in unlikely places",
  "ix. Predicting the future of reefs",
];

const B5_HEADINGS = [
  "i. A surface designed to filter light",
  "ii. The hidden depth of the eye",
  "iii. How the brain corrects the image",
  "iv. Two systems for day and night",
  "v. A blind spot we never notice",
  "vi. The eye compared to a camera",
  "vii. Why colour vision varies",
  "viii. Repairing damaged sight",
  "ix. The muscles that aim the eye",
];

const B6_HEADINGS = [
  "i. Soil as a store of carbon",
  "ii. The threat of erosion",
  "iii. Life beneath our feet",
  "iv. How soil forms over centuries",
  "v. Farming methods that rebuild soil",
  "vi. Soil and the supply of clean water",
  "vii. A resource taken for granted",
  "viii. The global loss of fertile land",
  "ix. Restoring exhausted ground",
];

export const READING_V3_A: ReadingDataV2[] = [
  // =====================================================================
  // 1 — How Plants Warn Each Other
  // =====================================================================
  {
    slot: "A",
    title: "How Plants Warn Each Other",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `For centuries, plants were regarded as passive organisms, rooted in place and incapable of responding to events around them. Research over the past four decades has overturned that view. A growing body of evidence shows that plants detect injury, signal danger and prepare their neighbours for an attack that has not yet reached them.

A  The first hint came from a study of willow and poplar trees in the late 1970s. Researchers noticed that when caterpillars stripped the leaves of one tree, untouched trees standing nearby began producing bitter, defensive compounds within days. Because the trees had no nervous system and no obvious means of communication, many botanists assumed the result was a coincidence or a flaw in the experiment, and the finding was largely ignored for years.

B  Later work identified the mechanism. A damaged leaf releases a cloud of volatile chemicals into the air, a mixture sometimes described as the smell of freshly cut grass. Neighbouring plants absorb these molecules through pores on their leaves and respond by switching on genes that thicken cell walls or manufacture toxins. The warning is therefore carried not by sound or touch but by scent, drifting on the breeze from one plant to the next.

C  Plants connected below ground can pass messages by another route entirely. Fine threads of fungi link the roots of many species, forming an underground web that carries water, nutrients and, it now appears, chemical signals. When one plant in such a network is attacked by aphids, others sharing the same fungal connections begin producing defences even though no chemicals have reached them through the air. The fungal threads act as a kind of buried cable.

D  Mounting a defence, however, is not free. Producing toxins and reinforcing tissue consumes energy and raw materials that a plant would otherwise spend on growth or seeds. A plant that responds to every faint signal risks weakening itself unnecessarily. Experiments suggest that plants weigh the strength and persistence of a warning before reacting fully, ignoring brief or weak signals and committing resources only when danger appears genuine.

E  The system is far from perfect. Volatile chemicals disperse quickly, so the warning rarely travels more than a metre or two from its source. Wind can carry the signal away from the plants that most need it, and some specialised insects have evolved to tolerate or even feed on the very toxins the warning triggers. For these pests, a plant's chemical alarm offers little protection at all.

F  Understanding this hidden communication may have practical value. If farmers can identify the exact compounds that trigger a defensive response, they might spray crops with a harmless version of the warning scent, prompting plants to prepare for pests before any insects arrive. Such an approach could reduce the use of conventional pesticides, although researchers caution that constantly defended crops may grow more slowly and yield less.`,
    questions: [
      // Group 1: Matching Headings (paragraphs A–F)
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: B1_HEADINGS, correctAnswer: "v. An early experiment that raised doubts" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: B1_HEADINGS, correctAnswer: "iii. How a silent alarm travels" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: B1_HEADINGS, correctAnswer: "vi. Trees that share through their roots" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: B1_HEADINGS, correctAnswer: "ii. The cost of sending warnings" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: B1_HEADINGS, correctAnswer: "viii. Limits of the warning system" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: B1_HEADINGS, correctAnswer: "ix. Lessons for managing forests" },
      // Group 2: True / False / Not Given
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The early willow and poplar study was immediately accepted by most botanists.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Damaged leaves release chemicals that other plants can absorb through their leaves.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Fungal threads connecting plant roots can carry chemical signals.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Producing chemical defences uses resources a plant could otherwise use for growth.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Plants respond fully to every warning signal they detect.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Airborne chemical warnings can travel several kilometres from their source.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Some insects are able to feed on the toxins that plant warnings trigger.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Spraying crops with warning scents has already become a common farming practice.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Crops kept in a constant state of defence may produce smaller harvests.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The smell of freshly cut grass is produced only by grasses and not by other plants.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
    ],
  },
  // =====================================================================
  // 2 — The Great Journeys of Migratory Birds
  // =====================================================================
  {
    slot: "A",
    title: "The Great Journeys of Migratory Birds",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Twice each year, billions of birds undertake journeys that span continents and oceans. A small songbird weighing less than a letter may fly from northern Europe to central Africa and back, while certain seabirds circle the entire planet within a single year. For a long time these movements were among the deepest mysteries in natural history.

A  Until the eighteenth century, the seasonal disappearance of familiar birds was explained in ways that now seem extraordinary. Some naturalists believed swallows spent the winter buried in the mud of ponds; others suggested that smaller species transformed into different birds, or even flew to the moon. The truth — that birds travelled thousands of kilometres and returned — seemed less plausible than these inventions, simply because no one could imagine how such journeys were possible.

B  Migration is fundamentally a response to the changing availability of food. Long northern summers produce an abundance of insects and seeds, ideal for raising young, but the same regions become barren and frozen in winter. Birds that breed in the north and retreat towards the equator are, in effect, following the supply of food around the globe. The cost of staying put would be starvation; the cost of leaving is the journey itself.

C  That journey is physically extreme. Before departure, many birds enter a phase of intense feeding, sometimes doubling their body weight in stored fat. During flight they may travel for days without rest, burning fat and even shrinking organs they do not need in the air. A bird crossing the Sahara or the Gulf of Mexico in a single effort is operating at the very edge of what its body can sustain, and unfavourable winds can prove fatal.

D  How birds find their way remains only partly understood. Experiments show that they draw on several independent guidance systems: the position of the sun, the pattern of stars, prominent landscape features, and — most remarkably — the Earth's magnetic field, which some species appear to perceive directly. Young birds making the trip for the first time, with no older companion to follow, can still reach a wintering ground they have never seen.

E  The development of miniature tracking devices has transformed the study of migration. Tags light enough to be carried by a small bird now record location, altitude and temperature for an entire year. These instruments have revealed routes and non-stop flights that earlier scientists would have dismissed as impossible, and have shown that individual birds often return to the same patch of forest, year after year, on almost the same date.

F  Migratory birds are also unusually vulnerable, precisely because they depend on a chain of separate places. A single drained wetland used as a refuelling stop can endanger a population that breeds and winters thousands of kilometres apart. Protecting such species therefore requires cooperation between many countries, none of which can secure the birds' survival on its own.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: B2_HEADINGS, correctAnswer: "viii. The first records of the phenomenon" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: B2_HEADINGS, correctAnswer: "i. A journey shaped by the seasons" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: B2_HEADINGS, correctAnswer: "iii. The energy demands of long flight" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: B2_HEADINGS, correctAnswer: "ii. Navigating without a map" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: B2_HEADINGS, correctAnswer: "v. How tracking changed the science" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: B2_HEADINGS, correctAnswer: "ix. Conservation across many borders" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Some early naturalists thought certain birds spent the winter beneath the surface of ponds.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Migration is described mainly as a response to changes in the availability of food.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Birds preparing for migration may roughly double their body weight.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Birds rely on only one method to navigate during migration.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Young birds always need an older bird to guide them on their first journey.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Modern tracking tags can record information for a full year.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Tracking has shown that individual birds often return to the same area each year.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The loss of a single refuelling site can threaten an entire bird population.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Seabirds that circle the planet are the most endangered of all migratory birds.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Unfavourable winds during a long crossing can kill migrating birds.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
    ],
  },
  // =====================================================================
  // 3 — The Microbes That Live Inside Us
  // =====================================================================
  {
    slot: "A",
    title: "The Microbes That Live Inside Us",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `The human body is not a single organism but a moving habitat. Trillions of bacteria, fungi and other microbes live on the skin and, above all, inside the digestive tract. Collectively known as the microbiome, this invisible population has become one of the most active frontiers in modern medicine.

A  Microbes vastly outnumber the body's own cells, and the great majority cause no harm. Most are concentrated in the large intestine, where they live in a dark, oxygen-poor environment that suits them well. They break down fibres that human enzymes cannot digest, manufacture certain vitamins, and occupy space that might otherwise be colonised by dangerous species. In this sense they function less like passengers than like a working organ the body cannot do without.

B  The composition of this community is not fixed at birth. A newborn acquires its first microbes during delivery and from early feeding, but the population continues to shift throughout childhood. By the age of about three, a child has usually developed a microbiome resembling an adult's, and researchers believe these early years may have lasting effects on how the immune system learns to tell harmless microbes from genuine threats.

C  Diet is the single most powerful influence on the microbiome in later life. A menu rich in vegetables, whole grains and fermented foods tends to support a varied population, while a diet dominated by sugar and heavily processed products favours a narrower and less stable mix. Because the bacterial community can change within days of a change in eating habits, the microbiome is one of the few aspects of personal health that an individual can reshape quite quickly.

D  Antibiotics, although often essential, can disturb this balance. A course of treatment aimed at a single infection inevitably kills many harmless species as well, and the community may take weeks or months to recover. Repeated or unnecessary use of antibiotics, particularly in early childhood, has been associated with a reduced diversity of gut bacteria, which some scientists link to a rise in allergies and other immune disorders.

E  Perhaps the most surprising research concerns the connection between the gut and the brain. The intestine contains a dense network of nerve cells, and chemical messengers produced by gut microbes can influence mood, appetite and stress responses. Studies in animals suggest that altering the microbiome can change behaviour, and early human trials are testing whether certain bacterial mixtures might ease anxiety or depression.

F  Such findings have generated considerable excitement, and also a flood of products claiming to "optimise" the microbiome. Researchers urge caution. Many supplements sold for this purpose have not been tested rigorously, and because each person's microbial community is unique, a treatment that helps one individual may do nothing for another. The science is genuinely promising, but it is still young, and its commercial uses have outpaced the evidence.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: B3_HEADINGS, correctAnswer: "i. A community living inside us" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: B3_HEADINGS, correctAnswer: "ii. The influence of early childhood" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: B3_HEADINGS, correctAnswer: "iii. How diet reshapes the population" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: B3_HEADINGS, correctAnswer: "vi. Damage caused by overusing medicines" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: B3_HEADINGS, correctAnswer: "iv. A link to the brain" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: B3_HEADINGS, correctAnswer: "v. Caution about exaggerated claims" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most of the microbes living in the human body are harmful.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Gut microbes can break down fibres that human enzymes cannot digest.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A baby's microbiome is fully formed at the moment of birth.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "By around the age of three a child's microbiome usually resembles that of an adult.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The microbiome can change within days of a change in diet.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Antibiotics kill only the specific bacteria causing an infection.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Chemicals produced by gut microbes may affect a person's mood.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Human trials have proven that bacterial mixtures cure depression.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Researchers advise caution about many products marketed to improve the microbiome.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Microbes on the skin are more numerous than those in the intestine.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
    ],
  },
  // =====================================================================
  // 4 — The Living Architecture of Coral Reefs
  // =====================================================================
  {
    slot: "A",
    title: "The Living Architecture of Coral Reefs",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Coral reefs occupy less than one per cent of the ocean floor, yet they support roughly a quarter of all marine species. To a casual observer a reef appears to be rock, but it is in fact a vast living structure, built grain by grain over thousands of years by some of the simplest animals in the sea.

A  An individual coral is a tiny, soft-bodied animal called a polyp, related to the jellyfish and the sea anemone. Each polyp draws calcium and carbonate from seawater and lays them down as a hard cup of limestone around its base. As generation succeeds generation, these cups accumulate into branching or boulder-like colonies. A reef visible from the surface may rest on the skeletons of corals that lived and died many centuries earlier.

B  This slow construction depends on an unusual partnership. Inside the tissue of most reef-building corals live microscopic algae that capture sunlight and convert it into sugars. The algae supply the coral with most of its food, while the coral offers the algae shelter and a steady supply of nutrients. It is this relationship that allows reefs to flourish in tropical waters that are otherwise remarkably poor in nutrients.

C  The completed structure becomes a refuge for an extraordinary range of life. Its cracks, ledges and hollows provide hiding places for fish, crabs, octopuses and countless smaller creatures, while its surfaces offer anchorage for sponges and other organisms. Larger predators patrol the open water around the reef, and many fish that are caught far out at sea depend on reefs as nurseries during the earliest part of their lives.

D  The coral–algae partnership, however, is delicately balanced. When seawater becomes too warm, even by only a degree or two for a sustained period, the coral expels the algae living within it. Stripped of its colourful partners, the coral turns a ghostly white, a condition known as bleaching. A bleached coral is not yet dead, but it has lost its main source of food, and if warm conditions persist it will eventually starve.

E  Warming is not the only pressure. Run-off from farms and cities carries sediment and excess nutrients onto reefs, sometimes from rivers many kilometres away, encouraging fast-growing seaweed that smothers slow-growing coral. The gradual acidification of the ocean, caused by rising carbon dioxide, makes it harder for polyps to build their limestone skeletons in the first place.

F  There are, nonetheless, grounds for cautious hope. Reefs inside well-managed marine protected areas, where fishing and pollution are controlled, often prove markedly more resilient and recover faster after disturbance. Scientists are also identifying coral populations that tolerate warmer water than usual, and experiments are under way to breed and transplant these hardier corals onto damaged reefs.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: B4_HEADINGS, correctAnswer: "ii. The slow construction of a reef" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: B4_HEADINGS, correctAnswer: "iii. A partnership under stress" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: B4_HEADINGS, correctAnswer: "i. Reefs as shelter for many species" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: B4_HEADINGS, correctAnswer: "vi. Why warm water turns coral white" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: B4_HEADINGS, correctAnswer: "iv. Damage from distant pollution" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: B4_HEADINGS, correctAnswer: "v. Signs of recovery in protected zones" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Coral reefs cover less than one per cent of the ocean floor.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A coral polyp is closely related to the jellyfish.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The algae inside coral provide the coral with most of its food.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Tropical waters where reefs grow are usually rich in nutrients.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "A coral dies immediately once it has bleached.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Pollution affecting reefs can originate from rivers far away.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Ocean acidification makes it harder for corals to build their skeletons.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Reefs in marine protected areas tend to recover faster after damage.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Transplanting heat-tolerant corals has already restored most damaged reefs.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Coral reefs grow faster in cooler waters than in tropical seas.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
    ],
  },
  // =====================================================================
  // 5 — How the Human Eye Sees
  // =====================================================================
  {
    slot: "A",
    title: "How the Human Eye Sees",
    level: CEFRLevel.B2,
    timeLimit: 1200,
    passage: `Vision feels effortless. We open our eyes and the world appears, sharp and continuous, with no sense of the elaborate process behind it. In reality, seeing is the result of a chain of events that begins with light entering the eye and ends with the brain assembling an image that the eye alone could never produce.

A  In its broad design, the eye works much as a camera does. Light passes through a transparent front window, the cornea, and then through an opening, the pupil, which widens in dim conditions and narrows in bright ones. A flexible lens behind the pupil bends the incoming light and focuses it onto a surface at the back of the eye. The basic principle — a lens projecting a focused picture onto a sensitive screen — is the same in both devices.

B  That sensitive screen is the retina, a thin layer packed with millions of light-detecting cells. The retina does not respond to light as a whole; instead it converts patterns of brightness and colour into tiny electrical signals. These signals are gathered together and carried towards the brain along the optic nerve, a thick bundle of fibres leaving the back of each eye.

C  The retina contains two distinct types of detector, suited to very different conditions. Rod cells are extremely sensitive and allow vision in near-darkness, but they cannot distinguish colours, which is why a moonlit landscape appears in shades of grey. Cone cells, concentrated near the centre of the retina, need far more light to function but provide sharp detail and the full range of colour. Most of what we consciously notice is built from the work of the cones.

D  There is one curious flaw in this arrangement. At the point where the optic nerve leaves the eye, the retina has no detectors at all, creating a small blind spot in each eye's field of view. We are normally entirely unaware of it, because the brain fills the gap using information from the other eye and from the surrounding area, smoothing over the hole so convincingly that most people never suspect it exists.

E  Indeed, much of what we call seeing happens not in the eye but in the brain. The image projected onto the retina is upside down, slightly blurred at the edges, and interrupted by the blind spot and by the constant tiny movements of the eye. The brain corrects the orientation, sharpens the picture, stabilises it against motion and combines the slightly different views from the two eyes into a single impression of depth.

F  When this system fails, the consequences can often be corrected. Many common problems arise simply because the eye is slightly too long or too short, so that light focuses just in front of or behind the retina. Glasses and contact lenses compensate by adjusting the light before it enters, and surgical reshaping of the cornea can achieve a similar result, restoring a clear image to millions of people.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: B5_HEADINGS, correctAnswer: "vi. The eye compared to a camera" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: B5_HEADINGS, correctAnswer: "i. A surface designed to filter light" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: B5_HEADINGS, correctAnswer: "iv. Two systems for day and night" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: B5_HEADINGS, correctAnswer: "v. A blind spot we never notice" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: B5_HEADINGS, correctAnswer: "iii. How the brain corrects the image" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: B5_HEADINGS, correctAnswer: "viii. Repairing damaged sight" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The pupil becomes wider in dim conditions.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The retina sends signals to the brain along the optic nerve.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Rod cells allow us to see colours in dim light.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Cone cells are concentrated near the centre of the retina.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Most people are constantly aware of the blind spot in each eye.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The image that reaches the retina is the right way up.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The brain combines the views from both eyes to create a sense of depth.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Many common vision problems are caused by the eye being slightly too long or too short.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Reshaping the cornea by surgery can produce a clearer image.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Birds have sharper vision than humans.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
    ],
  },
  // =====================================================================
  // 6 — The Forgotten Importance of Soil
  // =====================================================================
  {
    slot: "A",
    title: "The Forgotten Importance of Soil",
    level: CEFRLevel.C1,
    timeLimit: 1200,
    passage: `Soil is one of the most overlooked resources on Earth. It is walked on, built over and dismissed as mere dirt, yet almost all of the food humanity eats depends on a thin and fragile layer of it. Far from being lifeless, healthy soil is among the most crowded environments on the planet.

A  Soil does not appear quickly. It forms as rock is slowly broken apart by frost, water, wind and the action of living things, the resulting fragments mixing over time with the decayed remains of plants and animals. In many regions it takes several centuries to produce a single centimetre of fertile topsoil. Soil is, in practical terms, a renewable resource only on a timescale far longer than a human life.

B  A handful of healthy soil contains more living organisms than there are people on Earth. Bacteria, fungi, earthworms, insects and microscopic animals form a complex web in which each group depends on the others. These organisms break down dead material, release nutrients in a form that plant roots can absorb, and bind loose particles into crumbs that hold both air and water. Without this hidden activity, soil would be little more than inert dust.

C  Soil also plays a part in the climate that is only now being widely appreciated. The world's soils together store more carbon than the atmosphere and all living plants combined. When grassland or forest is ploughed up, much of that carbon is released as carbon dioxide; when soil is managed well, it can absorb and lock away carbon instead. The way land is farmed therefore has consequences far beyond the field itself.

D  Healthy soil is, in addition, a natural filter and reservoir. Rainwater that soaks into well-structured soil is cleaned of many impurities as it passes downward, eventually replenishing the underground stores that supply wells and rivers. Soil that has become compacted or stripped of vegetation cannot absorb water in the same way, so rain runs off the surface, increasing both flooding and drought.

E  Yet soil is being lost at an alarming rate. Ploughing, overgrazing and the clearing of trees leave bare earth exposed to wind and heavy rain, which carry it away far faster than nature can replace it. By some estimates, the world loses billions of tonnes of fertile soil every year, and a significant share of once-productive farmland has already been degraded to the point of abandonment.

F  The damage, however, is not irreversible. Farmers in many regions are adopting methods that protect and rebuild soil: disturbing the ground as little as possible, keeping it covered with plants throughout the year, and rotating a wider variety of crops. Where such practices have been followed for a decade or more, exhausted land has regained its fertility, showing that soil, given the chance, can recover.`,
    questions: [
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph A", options: B6_HEADINGS, correctAnswer: "iv. How soil forms over centuries" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph B", options: B6_HEADINGS, correctAnswer: "iii. Life beneath our feet" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph C", options: B6_HEADINGS, correctAnswer: "i. Soil as a store of carbon" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph D", options: B6_HEADINGS, correctAnswer: "vi. Soil and the supply of clean water" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph E", options: B6_HEADINGS, correctAnswer: "viii. The global loss of fertile land" },
      { type: QuestionType.MATCHING_HEADINGS, prompt: "Paragraph F", options: B6_HEADINGS, correctAnswer: "v. Farming methods that rebuild soil" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "It can take several centuries to form one centimetre of fertile topsoil.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Healthy soil contains very few living organisms.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Soil organisms help release nutrients in a form that plant roots can absorb.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "The world's soils store more carbon than the atmosphere and living plants combined.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Ploughing grassland tends to release carbon dioxide into the air.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Compacted soil absorbs rainwater more effectively than well-structured soil.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Some farmland has been degraded so badly that it has been abandoned.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Soil-protecting farming methods have restored fertility to exhausted land in some places.", options: ["True", "False", "Not Given"], correctAnswer: "True" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Soil erosion causes greater economic damage than any other environmental problem.", options: ["True", "False", "Not Given"], correctAnswer: "Not Given" },
      { type: QuestionType.TRUE_FALSE_NOT_GIVEN, prompt: "Damage to the world's soils cannot be reversed.", options: ["True", "False", "Not Given"], correctAnswer: "False" },
    ],
  },
];
