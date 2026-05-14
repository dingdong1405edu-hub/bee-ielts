import { CEFRLevel } from "@prisma/client";

type Exercise =
  | { type: "translate"; prompt: string; options: string[]; answer: string }
  | { type: "match"; prompt: string; options: string[]; answer: string }
  | { type: "type"; prompt: string; answer: string };

export interface VocabUnitData {
  title: string;
  level: CEFRLevel;
  order: number;
  iconKey?: string;
  lessons: { title: string; order: number; exercises: Exercise[] }[];
}

export const VOCAB_UNITS: VocabUnitData[] = [
  // ============ A1 ============
  {
    title: "A1 · Greetings & Family",
    level: CEFRLevel.A1,
    order: 1,
    lessons: [
      {
        title: "Greetings",
        order: 1,
        exercises: [
          { type: "translate", prompt: "Translate: 'Xin chào'", options: ["Hello", "Goodbye", "Thanks", "Sorry"], answer: "Hello" },
          { type: "translate", prompt: "Translate: 'Cảm ơn'", options: ["Sorry", "Please", "Thank you", "Welcome"], answer: "Thank you" },
          { type: "match", prompt: "Match: 'Goodbye'", options: ["Tạm biệt", "Xin chào", "Cảm ơn", "Xin lỗi"], answer: "Tạm biệt" },
          { type: "type", prompt: "Type the English for: 'Tôi tên là Nam'", answer: "my name is nam" },
          { type: "translate", prompt: "Translate: 'Bạn khỏe không?'", options: ["How old are you?", "How are you?", "What's your name?", "Where are you from?"], answer: "How are you?" },
        ],
      },
      {
        title: "Family members",
        order: 2,
        exercises: [
          { type: "translate", prompt: "Translate: 'Bố'", options: ["Father", "Mother", "Brother", "Sister"], answer: "Father" },
          { type: "translate", prompt: "Translate: 'Mẹ'", options: ["Aunt", "Mother", "Grandma", "Daughter"], answer: "Mother" },
          { type: "match", prompt: "Match: 'Sister'", options: ["Anh trai", "Em/Chị gái", "Bố", "Mẹ"], answer: "Em/Chị gái" },
          { type: "translate", prompt: "Translate: 'Ông'", options: ["Grandfather", "Uncle", "Cousin", "Nephew"], answer: "Grandfather" },
          { type: "type", prompt: "Type English: 'gia đình của tôi'", answer: "my family" },
        ],
      },
    ],
  },
  {
    title: "A1 · Numbers & Time",
    level: CEFRLevel.A1,
    order: 2,
    lessons: [
      {
        title: "Numbers 1–20",
        order: 1,
        exercises: [
          { type: "translate", prompt: "What number is 'three'?", options: ["1", "2", "3", "4"], answer: "3" },
          { type: "translate", prompt: "How do you say 12?", options: ["Ten", "Eleven", "Twelve", "Twenty"], answer: "Twelve" },
          { type: "type", prompt: "Spell the number 7", answer: "seven" },
          { type: "type", prompt: "Spell the number 15", answer: "fifteen" },
          { type: "translate", prompt: "How do you say 20?", options: ["Twelve", "Twenty", "Two", "Ten"], answer: "Twenty" },
        ],
      },
      {
        title: "Days & months",
        order: 2,
        exercises: [
          { type: "translate", prompt: "Translate: 'Thứ hai'", options: ["Sunday", "Monday", "Tuesday", "Friday"], answer: "Monday" },
          { type: "translate", prompt: "Which month comes after March?", options: ["April", "May", "February", "June"], answer: "April" },
          { type: "type", prompt: "What is the first month of the year?", answer: "january" },
          { type: "match", prompt: "Match: 'Tháng 12'", options: ["October", "November", "December", "September"], answer: "December" },
        ],
      },
    ],
  },
  {
    title: "A1 · Food & Drinks",
    level: CEFRLevel.A1,
    order: 3,
    lessons: [
      {
        title: "Common foods",
        order: 1,
        exercises: [
          { type: "translate", prompt: "Translate: 'Bánh mì'", options: ["Rice", "Bread", "Noodle", "Cake"], answer: "Bread" },
          { type: "translate", prompt: "Translate: 'Trứng'", options: ["Egg", "Fish", "Cheese", "Milk"], answer: "Egg" },
          { type: "match", prompt: "Match: 'Apple'", options: ["Cam", "Chuối", "Táo", "Dâu"], answer: "Táo" },
          { type: "type", prompt: "Type English for 'nước'", answer: "water" },
          { type: "translate", prompt: "Translate: 'Cà phê'", options: ["Tea", "Juice", "Coffee", "Wine"], answer: "Coffee" },
        ],
      },
    ],
  },

  // ============ A2 ============
  {
    title: "A2 · Daily Routine",
    level: CEFRLevel.A2,
    order: 1,
    lessons: [
      {
        title: "Daily activities",
        order: 1,
        exercises: [
          { type: "translate", prompt: "Translate: 'wake up'", options: ["thức dậy", "đi ngủ", "ăn sáng", "làm việc"], answer: "thức dậy" },
          { type: "translate", prompt: "Translate: 'have breakfast'", options: ["Ăn trưa", "Ăn sáng", "Ăn tối", "Uống nước"], answer: "Ăn sáng" },
          { type: "type", prompt: "Type English: 'đi làm'", answer: "go to work" },
          { type: "match", prompt: "Match: 'brush my teeth'", options: ["Đánh răng", "Rửa mặt", "Tắm", "Thay đồ"], answer: "Đánh răng" },
          { type: "translate", prompt: "Which one means 'go to bed'?", options: ["Đi học", "Đi ngủ", "Đi làm", "Đi chợ"], answer: "Đi ngủ" },
        ],
      },
      {
        title: "Places in town",
        order: 2,
        exercises: [
          { type: "translate", prompt: "Translate: 'hospital'", options: ["Trường học", "Bệnh viện", "Sân bay", "Siêu thị"], answer: "Bệnh viện" },
          { type: "translate", prompt: "Translate: 'library'", options: ["Quán cà phê", "Thư viện", "Nhà sách", "Rạp phim"], answer: "Thư viện" },
          { type: "type", prompt: "Type English: 'siêu thị'", answer: "supermarket" },
          { type: "match", prompt: "Match: 'pharmacy'", options: ["Bưu điện", "Tiệm thuốc", "Quán ăn", "Ngân hàng"], answer: "Tiệm thuốc" },
        ],
      },
    ],
  },
  {
    title: "A2 · Weather & Travel",
    level: CEFRLevel.A2,
    order: 2,
    lessons: [
      {
        title: "Weather",
        order: 1,
        exercises: [
          { type: "translate", prompt: "Translate: 'sunny'", options: ["Mưa", "Nắng", "Lạnh", "Tuyết"], answer: "Nắng" },
          { type: "translate", prompt: "Translate: 'humid'", options: ["Ẩm", "Khô", "Mát", "Nóng"], answer: "Ẩm" },
          { type: "type", prompt: "Type English: 'gió'", answer: "wind" },
          { type: "match", prompt: "Match: 'thunderstorm'", options: ["Mưa rào", "Bão", "Mưa giông", "Sương mù"], answer: "Mưa giông" },
        ],
      },
    ],
  },

  // ============ B1 ============
  {
    title: "B1 · Work & Career",
    level: CEFRLevel.B1,
    order: 1,
    lessons: [
      {
        title: "Job titles",
        order: 1,
        exercises: [
          { type: "translate", prompt: "Translate: 'accountant'", options: ["Kế toán", "Kĩ sư", "Bác sĩ", "Giáo viên"], answer: "Kế toán" },
          { type: "translate", prompt: "Translate: 'colleague'", options: ["Đồng nghiệp", "Sếp", "Khách hàng", "Học sinh"], answer: "Đồng nghiệp" },
          { type: "type", prompt: "Type English: 'sa thải'", answer: "fire" },
          { type: "type", prompt: "Type English: 'thăng chức'", answer: "promote" },
          { type: "match", prompt: "Match: 'deadline'", options: ["Hạn chót", "Lương", "Cuộc họp", "Hợp đồng"], answer: "Hạn chót" },
          { type: "translate", prompt: "What does 'remote work' mean?", options: ["Làm việc xa", "Làm việc từ xa", "Du lịch công tác", "Đi công tác"], answer: "Làm việc từ xa" },
        ],
      },
      {
        title: "Workplace verbs",
        order: 2,
        exercises: [
          { type: "translate", prompt: "What does 'apply for a job' mean?", options: ["Xin việc", "Bỏ việc", "Nhận việc", "Hỏi việc"], answer: "Xin việc" },
          { type: "translate", prompt: "What does 'resign' mean?", options: ["Bỏ việc", "Sa thải", "Nghỉ ốm", "Đi làm"], answer: "Bỏ việc" },
          { type: "type", prompt: "Type English: 'phỏng vấn'", answer: "interview" },
          { type: "match", prompt: "Match: 'overtime'", options: ["Giờ giải lao", "Tăng ca", "Đi muộn", "Đi sớm"], answer: "Tăng ca" },
        ],
      },
    ],
  },
  {
    title: "B1 · Health & Lifestyle",
    level: CEFRLevel.B1,
    order: 2,
    lessons: [
      {
        title: "Body parts & symptoms",
        order: 1,
        exercises: [
          { type: "translate", prompt: "Translate: 'headache'", options: ["Đau đầu", "Đau lưng", "Đau bụng", "Đau họng"], answer: "Đau đầu" },
          { type: "translate", prompt: "What does 'fever' mean?", options: ["Ho", "Sốt", "Cảm", "Buồn nôn"], answer: "Sốt" },
          { type: "type", prompt: "Type English: 'thuốc'", answer: "medicine" },
          { type: "match", prompt: "Match: 'prescription'", options: ["Đơn thuốc", "Tiền viện phí", "Bệnh án", "Vắc xin"], answer: "Đơn thuốc" },
        ],
      },
    ],
  },

  // ============ B2 ============
  {
    title: "B2 · Environment & Climate",
    level: CEFRLevel.B2,
    order: 1,
    lessons: [
      {
        title: "Climate change vocab",
        order: 1,
        exercises: [
          { type: "translate", prompt: "What is 'greenhouse gas'?", options: ["Khí nhà kính", "Khí thải", "Khí ozone", "Khí oxy"], answer: "Khí nhà kính" },
          { type: "translate", prompt: "Translate: 'biodiversity'", options: ["Đa dạng sinh học", "Sinh thái", "Môi trường", "Thiên nhiên"], answer: "Đa dạng sinh học" },
          { type: "type", prompt: "Type English: 'phá rừng'", answer: "deforestation" },
          { type: "match", prompt: "Match: 'renewable energy'", options: ["Năng lượng hạt nhân", "Năng lượng tái tạo", "Năng lượng sạch", "Năng lượng mặt trời"], answer: "Năng lượng tái tạo" },
          { type: "translate", prompt: "What does 'carbon footprint' mean?", options: ["Dấu chân carbon", "Lượng khí thải cá nhân", "Cả 2 đều đúng", "Không có nghĩa"], answer: "Cả 2 đều đúng" },
          { type: "type", prompt: "Type English: 'nóng lên toàn cầu'", answer: "global warming" },
        ],
      },
    ],
  },
  {
    title: "B2 · Technology",
    level: CEFRLevel.B2,
    order: 2,
    lessons: [
      {
        title: "Tech & internet",
        order: 1,
        exercises: [
          { type: "translate", prompt: "Translate: 'cybersecurity'", options: ["An ninh mạng", "Bảo mật", "Mã hoá", "Lập trình"], answer: "An ninh mạng" },
          { type: "match", prompt: "Match: 'algorithm'", options: ["Thuật toán", "Cơ sở dữ liệu", "Mã nguồn", "Lưu trữ"], answer: "Thuật toán" },
          { type: "type", prompt: "Type English: 'trí tuệ nhân tạo'", answer: "artificial intelligence" },
          { type: "translate", prompt: "What does 'streaming' refer to?", options: ["Phát trực tuyến", "Tải xuống", "Lưu trữ", "Đăng tải"], answer: "Phát trực tuyến" },
        ],
      },
    ],
  },

  // ============ C1 ============
  {
    title: "C1 · Society & Politics",
    level: CEFRLevel.C1,
    order: 1,
    lessons: [
      {
        title: "Social issues",
        order: 1,
        exercises: [
          { type: "translate", prompt: "What is 'inequality'?", options: ["Bất công", "Bất bình đẳng", "Phân biệt", "Đối xử"], answer: "Bất bình đẳng" },
          { type: "translate", prompt: "Define 'urbanization'", options: ["Hiện đại hoá", "Đô thị hoá", "Phát triển", "Công nghiệp hoá"], answer: "Đô thị hoá" },
          { type: "type", prompt: "English for 'người tị nạn'", answer: "refugee" },
          { type: "type", prompt: "English for 'nhập cư'", answer: "immigration" },
          { type: "match", prompt: "Match: 'discrimination'", options: ["Phân biệt đối xử", "Đối thoại", "Đàm phán", "Hợp tác"], answer: "Phân biệt đối xử" },
        ],
      },
      {
        title: "Politics vocab",
        order: 2,
        exercises: [
          { type: "translate", prompt: "What does 'democracy' mean?", options: ["Dân chủ", "Quân chủ", "Độc tài", "Cộng hoà"], answer: "Dân chủ" },
          { type: "type", prompt: "English for 'bầu cử'", answer: "election" },
          { type: "match", prompt: "Match: 'policy'", options: ["Chính sách", "Pháp luật", "Quy định", "Hiến pháp"], answer: "Chính sách" },
        ],
      },
    ],
  },

  // ============ C2 ============
  {
    title: "C2 · Idioms & Nuance",
    level: CEFRLevel.C2,
    order: 1,
    lessons: [
      {
        title: "Common idioms",
        order: 1,
        exercises: [
          { type: "translate", prompt: "'Hit the books' means…", options: ["Đập sách", "Học hành chăm chỉ", "Bán sách", "Đọc sách giải trí"], answer: "Học hành chăm chỉ" },
          { type: "translate", prompt: "'Once in a blue moon' = ?", options: ["Hằng ngày", "Hiếm khi", "Mỗi tháng", "Mỗi năm"], answer: "Hiếm khi" },
          { type: "type", prompt: "Complete: 'It's raining ___ and dogs'", answer: "cats" },
          { type: "match", prompt: "'Break a leg' is said to…", options: ["Doạ ai", "Chúc may mắn", "Doạ phá", "Trêu chọc"], answer: "Chúc may mắn" },
          { type: "translate", prompt: "'Bite the bullet' = ?", options: ["Chấp nhận và đối mặt", "Cắn răng chờ", "Bỏ cuộc", "Hành động liều lĩnh"], answer: "Chấp nhận và đối mặt" },
        ],
      },
      {
        title: "Academic collocations",
        order: 2,
        exercises: [
          { type: "type", prompt: "Complete: 'conduct ___' (a study)", answer: "research" },
          { type: "translate", prompt: "Best fit: 'reach a ___ '", options: ["conclusion", "ending", "finish", "stop"], answer: "conclusion" },
          { type: "type", prompt: "Complete: 'play a vital ___' in something", answer: "role" },
          { type: "match", prompt: "'pose a threat to' means…", options: ["Là mối đe doạ với", "Bảo vệ khỏi", "Tránh xa", "Ủng hộ"], answer: "Là mối đe doạ với" },
        ],
      },
    ],
  },
];
