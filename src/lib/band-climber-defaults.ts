/**
 * Default "Vượt band" content — the three opening stages the product spec
 * shipped with. Used to seed an empty DB through the admin "Tạo mặc định"
 * button so the admin doesn't have to paste the whole brief by hand.
 *
 * Each `*Markdown` field is plain markdown (admin form renders it as a
 * textarea, the user view renders it via the markdown renderer). Edit
 * freely — the seed endpoint is idempotent on (fromBand, toBand).
 */

export interface BandStageDefault {
  fromBand: number;
  toBand: number;
  title: string;
  subtitle: string;
  description: string;
  order: number;
  reading: string;
  listening: string;
  writing: string;
  speaking: string;
}

export const BAND_STAGE_DEFAULTS: BandStageDefault[] = [
  {
    fromBand: 4.0,
    toBand: 5.0,
    title: "Từ Band 4.0 lên 5.0",
    subtitle: "Xây nền & Tận dụng điểm dễ",
    description:
      "Mục tiêu là làm quen với áp lực phòng thi, không bị rối trước đề bài dài và ăn trọn vẹn điểm ở các câu hỏi cơ bản.",
    order: 1,
    reading: `## 📖 Reading: Kỹ thuật "Quét neo" và "Nhặt điểm"

### Mẹo "Săn tìm từ neo cứng" (Hard Keywords)

Đừng cố đọc hiểu cả đoạn văn. Khi đọc câu hỏi, hãy lập tức dùng bút chì khoanh tròn các **"từ neo" không thể bị biến đổi** (paraphrase) trong bài đọc. Đó là:

- Số liệu, năm
- Tên riêng viết hoa
- Tên quốc gia
- Thuật ngữ chuyên ngành nằm trong ngoặc kép

**Cách áp dụng:** Liếc nhanh mắt qua bài đọc (Scan) theo đường ziczac chỉ để tìm đúng vị trí của từ viết hoa hoặc con số đó. Đáp án thường chỉ nằm xung quanh vị trí đó 1–2 câu.

### Mẹo "Ưu tiên làm dạng bài theo thứ tự" (Order-based questions)

Tập trung ăn điểm tuyệt đối ở các dạng bài mà câu hỏi xuất hiện tuần tự theo nội dung bài đọc như:

- Gap-filling (Điền từ vào chỗ trống)
- True/False/Not Given
- Short Answer Questions

Gặp dạng **Matching Headings** (Nối tiêu đề) hay **Which paragraph contains...** thì hãy để lại làm cuối cùng để tránh mất thời gian.`,
    listening: `## 🎧 Listening: Đoán trước và Viết nháp nhanh

### Mẹo "Dự đoán từ loại & Ngữ cảnh" (Predicting)

Trong thời gian ngắn ngủi trước khi băng chạy (khoảng 30 giây), hãy nhìn vào các chỗ trống của Section 1 và ghi nhanh ký hiệu ngay bên cạnh:

- **N** (Danh từ)
- **V** (Động từ)
- **Adj** (Tính từ)
- **No.** (Số điện thoại / Ngày tháng)

**Ví dụ:** Nếu trước chỗ trống có chữ "at...", tai bạn phải lập tức kích hoạt chế độ đón nhận một con số (thời gian) hoặc một địa điểm.

### Mẹo "Tốc ký ký tự đầu"

Khi nghe Section 1 hoặc 2, nếu gặp từ dài (ví dụ: *accommodation*), đừng cố nắn nót viết hết cả từ vì tai bạn sẽ bỏ lỡ câu tiếp theo. Hãy viết nhanh **accom...** vào đề bài. Bạn luôn có 10 phút cuối giờ để chép lại cẩn thận vào tờ đáp án.`,
    writing: `## ✍️ Writing: Đóng khung cấu trúc ăn điểm ngữ pháp

### Mẹo "Thuộc lòng Template Paraphrase"

Ở band 4.5, việc tự nghĩ ra câu mở bài rất dễ sai ngữ pháp. Hãy chuẩn bị sẵn các công thức bất bại để lắp ghép từ vựng từ đề bài vào:

- **Task 1:** *The line graph/bar chart illustrates/compares the number of [Subject] in [Country] from [Year] to [Year].*
- **Task 2:** *It is often argued that [Idea 1], while others believe that [Idea 2].*

### Mẹo "Sử dụng từ nối an toàn"

Để bài viết có sự liên kết liên tục (Coherence), mỗi khi chuyển ý hoặc thêm ý, hãy bắt đầu câu bằng các từ nối basic nhưng luôn đúng:

- **In addition**
- **Highlighting this**
- **However**
- **For example**
- **As a result**`,
    speaking: `## 🗣️ Speaking: Mẹo câu giờ và Giữ mạch nói

### Mẹo "Cứu nguy khi bí ý" (Filler Phrases)

Gặp câu hỏi khó ở Part 1 hoặc Part 3, thay vì im lặng (tạo ra "khoảng chết" bị trừ điểm rất nặng), hãy học thuộc các câu câu giờ giúp bạn có thêm 3–5 giây suy nghĩ:

- *"That's a really interesting question, let me think about it for a second..."*
- *"To be honest, I haven't thought about this before, but I guess..."*

### Mẹo "Kéo dài câu trả lời bằng công thức PPF" (Past - Present - Future)

Nếu không biết nói gì thêm, hãy kể về quá khứ hoặc dự định tương lai của chủ đề đó.

**Ví dụ:** Hỏi về sở thích đọc sách hiện tại → Nói thêm ngày xưa lúc nhỏ thích đọc truyện tranh gì → Tương lai muốn mua thêm sách gì.`,
  },
  {
    fromBand: 5.0,
    toBand: 6.0,
    title: "Từ Band 5.0 lên 6.0",
    subtitle: "Quản lý thời gian & Nhận diện bẫy",
    description:
      "Mục tiêu lúc này là tăng tốc độ xử lý thông tin, nhận diện được các từ đồng nghĩa (paraphrasing) và kiểm soát được các lỗi sai lặt vặt.",
    order: 2,
    reading: `## 📖 Reading: Kỹ thuật Highlight phân tầng và Đọc quét ý chính

### Mẹo "Highlight phân tầng câu hỏi" (Layered Highlighting)

Khi đọc câu hỏi, thay vì gạch chân vô tội vạ, hãy dùng bút chì highlight theo **2 tầng**:

- **Tầng 1 (Gạch chân thẳng):** Từ khóa nội dung chính (Danh từ chính, động từ hành động).
- **Tầng 2 (Khoanh tròn hoặc đóng khung):** Từ chỉ tần suất/định lượng hạn chế như *All, Only, Most, Never, Always*. Đây chính là những từ quyết định câu đó là **False** hay **Not Given**.

### Mẹo "Skimming qua câu đầu và câu cuối" của đoạn văn

Đối với dạng bài khó như Matching Headings, hãy áp dụng mẹo đọc **1–2 câu đầu tiên và câu cuối cùng** của từng đoạn. Khoảng 70-80% các đoạn văn trong IELTS được viết theo kiểu diễn dịch hoặc quy nạp, ý chính (Topic sentence) sẽ nằm ở các vị trí này.`,
    listening: `## 🎧 Listening: Bắt trọn "Từ báo hiệu chuyển hướng" (Signposting Words)

### Mẹo "Cảnh giác với bẫy sửa lời" (Correction Trap)

Ở Band 5.5+, người nói trong băng rất hay tự sửa lại lời mình để lừa thí sinh. Hãy đặc biệt tỉnh táo khi nghe các từ như: **But, Actually, Hold on, Sorry, On second thought**.

**Ví dụ:** *"We will meet on Tuesday. Oh, sorry, I forgot I have a doctor appointment, let's change it to Thursday."* → Đáp án đúng phải là **Thursday**, ai ghi Tuesday là dính bẫy.

### Mẹo "Nhìn trước 2 câu hỏi cùng lúc"

Đừng chỉ nhìn chằm chằm vào câu hỏi hiện tại. Hãy luôn liếc mắt xuống câu tiếp theo. Nếu băng trôi qua từ khóa của câu dưới mà bạn chưa điền được câu trên, chứng tỏ bạn đã bị **"lỡ tàu"**. Hãy bỏ ngay câu trên để tập trung nghe tiếp, tránh hiệu ứng domino làm sai cả một chuỗi phía sau.`,
    writing: `## ✍️ Writing: Nâng cấp liên kết và Đa dạng hóa câu

### Mẹo "Mở bài không lặp từ" (Active to Passive)

Để nâng band, cách nhanh nhất là biến đổi cấu trúc câu từ chủ động ở đề bài sang bị động ở bài viết của mình, hoặc ngược lại.

- **Đề bài:** *"The government should spend money on healthcare..."*
- **Viết lại:** *"It is argued that financial budget should be allocated to healthcare services by the government..."*

### Mẹo "Viết câu phức bằng Mệnh đề quan hệ"

Bắt buộc trong bài viết Task 2 phải xuất hiện ít nhất **3–4 câu** dùng *Which, Who, That, Where* để kéo dài câu và chứng minh với giám khảo là bạn biết viết câu phức.`,
    speaking: `## 🗣️ Speaking: Mẹo "Bắn" từ vựng theo chủ đề (Topic Vocabulary)

### Mẹo "Chuẩn bị sẵn 3 câu chuyện vạn năng" cho Part 2

Đừng chuẩn bị 50 đề Part 2 riêng lẻ. Hãy soạn ra **3 câu chuyện cốt lõi** có thể "xào nấu" cho mọi đề bài:

1. Câu chuyện về **1 người** (Idol / Thầy cô / Bạn thân / Người thân).
2. Câu chuyện về **1 chuyến đi / Trải nghiệm đáng nhớ**.
3. Câu chuyện về **1 đồ vật / Một cuốn sách / Bộ phim**.

**Ví dụ:** Câu chuyện về một chuyến đi biển có thể dùng cho đề: Kể về một chuyến đi xa, Kể về một lần bạn ở gần thiên nhiên, Kể về một kỳ nghỉ bạn nhớ nhất, Kể về một sự kiện thời tiết khắc nghiệt bạn từng trải qua.

### Mẹo "Nói rõ ràng và Nhấn trọng âm"

Ở band 6.0, bạn không cần nói quá nhanh hay dùng từ quá cao siêu. Mẹo ở đây là nói vừa phải nhưng **nhấn mạnh vào các từ mang thông tin** (Danh từ, Động từ, Tính từ) và thả lỏng ở các trợ động từ/giới từ.`,
  },
  {
    fromBand: 6.0,
    toBand: 7.0,
    title: "Từ Band 6.0 lên 7.0+",
    subtitle: "Tư duy phản biện & Tinh chỉnh chuyên sâu",
    description:
      "Ở chặng này, bạn đã có nền tảng tốt. Các mẹo bây giờ tập trung vào việc đọc vị tư duy của người ra đề và thể hiện tư duy ngôn ngữ linh hoạt.",
    order: 3,
    reading: `## 📖 Reading: Đọc vị bẫy Paraphrase và Hiểu ngụ ý

### Mẹo "Lập bảng từ đồng nghĩa" (Keyword Connection Table)

Khi luyện đề ở nhà, mẹo cốt lõi để đạt band 7.0+ **không phải là làm nhiều đề**, mà là sau mỗi bài test, hãy lập một bảng gồm 2 cột: **Từ khóa trong câu hỏi** vs. **Từ thực tế xuất hiện trong bài đọc**.

Người ra đề band cao chỉ dùng các từ đồng nghĩa rất tinh vi (ví dụ: câu hỏi ghi "environmental degradation", bài đọc ghi "damage to local ecosystems"). Thuộc được các cặp từ này giúp bạn nâng cao tốc độ phản xạ khi đi thi thật.

### Mẹo "Loại trừ trong dạng bài Matching Features"

Đối với dạng bài nối tên chuyên gia với quan điểm của họ, hãy dùng bút chì định vị **hết tất cả các vị trí tên** của ông A xuất hiện trong toàn bài. Đọc quét các động từ đi kèm như *argued, pointed out, suggested* để chốt nhanh quan điểm của họ.`,
    listening: `## 🎧 Listening: Mẹo "Tập trung vào tính từ thái độ" ở Section 3 & 4

### Mẹo "Bắt tone giọng và Từ biểu cảm" (Attitude Tracking)

Ở các bài hội thoại thảo luận học thuật (Section 3), đáp án thường **không nằm ở từ khóa trực diện** mà nằm ở thái độ của người nói (đồng ý, nghi ngờ, bác bỏ). Hãy chú ý các từ mang tính lật kèo nhẹ nhàng như:

- *Interesting point, but...*
- *I'm not really sure about that*
- *That sounds plausible, however...*

### Mẹo "Viết hoa toàn bộ đáp án" (ALL CAPS)

Để tránh những lỗi sai ngớ ngẩn cực kỳ đáng tiếc về việc viết hoa tên riêng, tên đường, hay đầu câu, mẹo đơn giản của các cao thủ là **viết hoa toàn bộ tất cả các chữ cái** trong tờ trả lời (Ví dụ: LONDON, ENVIRONMENT, THURSDAY). Quy chế thi IELTS hoàn toàn chấp nhận điều này.`,
    writing: `## ✍️ Writing: Tư duy mạch lạc (Cohesion) và Từ vựng đắt giá

### Mẹo "Dùng đại từ thay thế để tránh lặp từ"

Thay vì lặp lại cụm từ *"young people"* nhiều lần, hãy dùng *"this demographic"*, *"these individuals"*, hoặc dùng đại từ *"they/them"* một cách khéo léo để liên kết câu trước với câu sau.

### Mẹo "Collocation thay vì từ đơn lẻ"

Giám khảo band 7.0+ không thích những từ đao to búa lớn bị ép vào câu một cách khiên cưỡng. Hãy dùng các cụm từ đi liền với nhau tự nhiên (Collocations):

- Thay vì nói: *"solve this big problem"*
- Hãy nói: *"address this pressing issue"* hoặc *"adopt a comprehensive approach to mitigate this problem"*.`,
    speaking: `## 🗣️ Speaking: Mẹo "Nâng tầm quan điểm" ở Part 3

### Mẹo "Nâng tầm từ Cá nhân lên Xã hội"

Ở Part 3, cấu trúc câu trả lời ăn điểm nhất là **phân tách câu trả lời theo các nhóm đối tượng khác nhau** thay vì chỉ nói chung chung.

**Cách nói:**

- *"From an individual perspective, ... However, on a societal level, ..."*
- *"It really depends on the generation. For the elderly, ... whereas for the younger generation, ..."*

Việc chia nhỏ góc nhìn này giúp bài nói của bạn sâu sắc, dài dặn và đậm chất phản biện của band 7.0+.

### Mẹo "Sử dụng Idioms/Phrasal Verbs một cách tự nhiên"

Không lạm dụng nhồi nhét quá nhiều thành ngữ cổ. Hãy dùng các phrasal verbs hoặc idioms thông dụng trong đời sống của người bản xứ như:

- **burn the midnight oil** (thức khuya học bài)
- **hit the books**
- **click with someone**
- **clear as crystal**`,
  },
];
