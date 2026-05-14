export interface WritingTaskData {
  taskType: 1 | 2;
  prompt: string;
  imageUrl?: string;
  minWords: number;
  timeLimit: number;
}

export interface SpeakingSetData {
  topic: string;
  part1Questions: string[];
  part2CueCard: { topic: string; points: string[] };
  part3Questions: string[];
}

export const WRITING_TASKS: WritingTaskData[] = [
  // Task 1 (academic)
  {
    taskType: 1,
    prompt: "The chart below shows the percentage of households in owned and rented accommodation in England and Wales between 1918 and 2011.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
    minWords: 150,
    timeLimit: 1200,
  },
  {
    taskType: 1,
    prompt: "The bar chart below shows the proportion of energy generated from different renewable sources (solar, wind, hydro, biomass) in five countries in 2010 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
    minWords: 150,
    timeLimit: 1200,
  },
  {
    taskType: 1,
    prompt: "The line graph below shows the average monthly temperatures in three Asian cities (Tokyo, Singapore and Mumbai) over the course of a year.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
    minWords: 150,
    timeLimit: 1200,
  },
  {
    taskType: 1,
    prompt: "The diagram below illustrates the process by which paper is recycled.\n\nSummarise the information by selecting and reporting the main features.\n\nWrite at least 150 words.",
    minWords: 150,
    timeLimit: 1200,
  },
  {
    taskType: 1,
    prompt: "The two maps below show a town centre in 1990 and in 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
    minWords: 150,
    timeLimit: 1200,
  },
  {
    taskType: 1,
    prompt: "The pie charts below show the proportion of household expenditure on food, housing, transport, leisure and other categories in 2000 and 2020.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
    minWords: 150,
    timeLimit: 1200,
  },
  {
    taskType: 1,
    prompt: "The table below shows the number of international tourists (in millions) visiting four countries in 2015, 2018 and 2022.\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant.\n\nWrite at least 150 words.",
    minWords: 150,
    timeLimit: 1200,
  },

  // Task 2
  {
    taskType: 2,
    prompt: "Some people think that the best way to reduce crime is to give longer prison sentences. Others, however, believe there are better alternative ways of reducing crime.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
  {
    taskType: 2,
    prompt: "Many people believe that social networking sites have had a huge negative impact on both individuals and society.\n\nTo what extent do you agree or disagree?\n\nWrite at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
  {
    taskType: 2,
    prompt: "Some people think governments should spend more money on public services like healthcare and education, while others believe the money should go to defence.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
  {
    taskType: 2,
    prompt: "In some countries, the average weight of people is increasing and their levels of health and fitness are decreasing.\n\nWhat do you think are the causes of these problems and what measures could be taken to solve them?\n\nWrite at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
  {
    taskType: 2,
    prompt: "Some people argue that all experimentation on animals should be banned. Others, however, believe that medical research depends on it.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
  {
    taskType: 2,
    prompt: "Many countries are encouraging young people to study abroad. To what extent do the advantages of studying abroad outweigh the disadvantages?\n\nWrite at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
  {
    taskType: 2,
    prompt: "In many cities, traffic congestion and pollution are major problems.\n\nWhat measures could governments take to address these issues? Write at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
  {
    taskType: 2,
    prompt: "Some people think children should be required to learn a foreign language at primary school, while others argue this should wait until secondary school.\n\nDiscuss both views and give your own opinion.\n\nWrite at least 250 words.",
    minWords: 250,
    timeLimit: 2400,
  },
];

export const SPEAKING_SETS: SpeakingSetData[] = [
  {
    topic: "Hometown & Daily Life",
    part1Questions: [
      "What's your name?",
      "Where is your hometown?",
      "What do you like most about your hometown?",
      "How has your hometown changed in recent years?",
      "Would you like to live there in the future? Why or why not?",
    ],
    part2CueCard: {
      topic: "Describe a place in your hometown that you enjoy visiting",
      points: ["Where it is", "How often you go there", "What you do there", "Why you like it"],
    },
    part3Questions: [
      "Why do people enjoy visiting parks?",
      "How important are public spaces in modern cities?",
      "Should governments invest more in recreational facilities?",
      "Do you think these places will change in the future?",
    ],
  },
  {
    topic: "Work & Study",
    part1Questions: [
      "Do you work or are you a student?",
      "What subject or job are you focused on?",
      "What do you like about your job/studies?",
      "Is it difficult to balance work and personal life?",
      "What skills do you think are important for your field?",
    ],
    part2CueCard: {
      topic: "Describe a skill you would like to learn",
      points: ["What it is", "How you would learn it", "How long it might take", "Why you want to learn it"],
    },
    part3Questions: [
      "Are practical skills or theoretical knowledge more valuable today?",
      "Should schools teach more vocational subjects?",
      "How is technology changing the way people learn?",
      "Will lifelong learning become more important in the future?",
    ],
  },
  {
    topic: "Technology",
    part1Questions: [
      "What kind of technology do you use most often?",
      "Has technology changed the way you communicate with friends?",
      "Do you prefer reading on paper or on screens?",
      "How do you feel about being online for long periods?",
    ],
    part2CueCard: {
      topic: "Describe a piece of technology that has improved your life",
      points: ["What it is", "How you use it", "How often you use it", "How it has improved your life"],
    },
    part3Questions: [
      "How has technology changed family life?",
      "Are children too dependent on technology these days?",
      "What are the risks of relying too much on digital devices?",
      "How might technology change in the next 20 years?",
    ],
  },
  {
    topic: "Travel & Holidays",
    part1Questions: [
      "Do you enjoy travelling?",
      "What kind of places do you prefer to visit?",
      "Do you usually travel alone or with others?",
      "What's the most memorable trip you've taken?",
      "Would you like to travel more in the future?",
    ],
    part2CueCard: {
      topic: "Describe a memorable journey you have taken",
      points: ["Where you went", "Who you went with", "What you did there", "Why it was memorable"],
    },
    part3Questions: [
      "Why do people travel to other countries?",
      "What is the impact of tourism on local cultures?",
      "Should governments limit tourist numbers at popular sites?",
      "How might travel change due to climate concerns?",
    ],
  },
  {
    topic: "Food & Cooking",
    part1Questions: [
      "What kind of food do you enjoy most?",
      "Do you cook at home or eat out more often?",
      "Are there any foods you don't like?",
      "Has your diet changed in recent years?",
    ],
    part2CueCard: {
      topic: "Describe a meal you enjoyed",
      points: ["Where you had it", "Who you were with", "What you ate", "Why it was enjoyable"],
    },
    part3Questions: [
      "Why do you think fast food is so popular?",
      "How has the way people eat changed over the last 30 years?",
      "Should schools teach children how to cook?",
      "What role does food play in a culture?",
    ],
  },
  {
    topic: "Books & Reading",
    part1Questions: [
      "Do you enjoy reading?",
      "What types of books do you prefer?",
      "Do you read more in your own language or in English?",
      "How often do you read?",
    ],
    part2CueCard: {
      topic: "Describe a book that you have enjoyed",
      points: ["What it was about", "When you read it", "Why you enjoyed it", "Whether you would recommend it"],
    },
    part3Questions: [
      "Why do some people prefer e-books to printed books?",
      "How can parents encourage children to read more?",
      "Are libraries still important today?",
      "Will physical bookshops disappear in the future?",
    ],
  },
  {
    topic: "Environment",
    part1Questions: [
      "Are you concerned about the environment?",
      "What environmental problems are common in your country?",
      "Do you try to live in an eco-friendly way?",
      "Have you noticed climate changes in your region?",
    ],
    part2CueCard: {
      topic: "Describe an environmental problem in your area",
      points: ["What the problem is", "What caused it", "Who is affected", "What is being done about it"],
    },
    part3Questions: [
      "What can individuals do to reduce their impact on the environment?",
      "Should governments take stronger action on climate change?",
      "Are large companies doing enough to be sustainable?",
      "How will environmental problems affect future generations?",
    ],
  },
  {
    topic: "Friendship & Social Life",
    part1Questions: [
      "How often do you meet your friends?",
      "How did you meet your closest friend?",
      "Do you prefer a few close friends or a large group?",
      "Is it easy to make new friends as an adult?",
    ],
    part2CueCard: {
      topic: "Describe a friend who has had a big influence on you",
      points: ["Who the person is", "How you met them", "What you do together", "How they influenced you"],
    },
    part3Questions: [
      "How do friendships change as people get older?",
      "Are online friendships as meaningful as offline ones?",
      "Why do some friendships last for life while others don't?",
      "What role do friendships play in personal development?",
    ],
  },
  {
    topic: "Sports & Exercise",
    part1Questions: [
      "Do you do any sports or exercise?",
      "Did you enjoy sports at school?",
      "Do you prefer team sports or individual sports?",
      "How often do you watch sports?",
    ],
    part2CueCard: {
      topic: "Describe a sport you enjoy watching or playing",
      points: ["What the sport is", "How you got into it", "How often you do it", "Why you enjoy it"],
    },
    part3Questions: [
      "Why is exercise important for health?",
      "Should governments do more to promote sport?",
      "Why are some sports more popular than others in different countries?",
      "Is winning the most important thing in sport?",
    ],
  },
  {
    topic: "Music & Entertainment",
    part1Questions: [
      "What kind of music do you like?",
      "Do you play any musical instruments?",
      "How do you usually listen to music?",
      "Has your taste in music changed over the years?",
    ],
    part2CueCard: {
      topic: "Describe a singer or band you like",
      points: ["Who they are", "How you discovered them", "What kind of music they make", "Why you like them"],
    },
    part3Questions: [
      "How important is music in modern life?",
      "Should music be taught in schools?",
      "How has streaming changed the music industry?",
      "Why do certain songs become popular globally?",
    ],
  },
  {
    topic: "Education",
    part1Questions: [
      "Did you enjoy your school days?",
      "What was your favourite subject?",
      "Are exams a fair way of assessing students?",
      "Do you prefer learning alone or in groups?",
    ],
    part2CueCard: {
      topic: "Describe a teacher who influenced you",
      points: ["Who the teacher was", "What they taught", "What kind of teacher they were", "How they influenced you"],
    },
    part3Questions: [
      "What makes a good teacher?",
      "Should education be free for everyone?",
      "How has technology changed teaching?",
      "Is university education necessary for success?",
    ],
  },
  {
    topic: "Future Plans",
    part1Questions: [
      "What are your plans for the next year?",
      "Do you usually set goals for yourself?",
      "How do you make important decisions?",
      "Do you think long-term plans are useful?",
    ],
    part2CueCard: {
      topic: "Describe a goal you would like to achieve in the next five years",
      points: ["What the goal is", "Why it matters to you", "What steps you'll take", "How achieving it would make you feel"],
    },
    part3Questions: [
      "Are young people today more ambitious than in the past?",
      "How do family expectations shape personal goals?",
      "Is it better to focus on one big goal or many small ones?",
      "How important is it to be flexible about long-term plans?",
    ],
  },
];
