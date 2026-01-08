# Markdown 공지사항 시스템 구현 가이드

JSON 대신 **Markdown(.md) 파일**을 사용하여 공지사항을 작성하고, 이미지까지 첨부하는 방법입니다.

## 1. 파일 구조 변경
`public/notices` 폴더 구조를 아래와 같이 변경합니다.

```text
public/
  notices/
    list.json        <-- 목록용 요약 데이터 (제목, 날짜, 파일명 등)
    files/           <-- 실제 내용이 담긴 md 파일들
      notice_1.md
      notice_2.md
    images/          <-- 공지사항에 들어갈 이미지들
      event_banner.png
```

## 2. Markdown 파일 작성 예시 (`public/notices/files/notice_1.md`)
이미지는 `![설명](/notices/images/파일명.png)` 형식으로 넣으면 됩니다.
(주의: `public` 폴더 기준 절대 경로를 사용합니다)

```markdown
# 신규 런칭 이벤트 진행

안녕하세요! **K-Guard** 운영팀입니다.
드디어 정식 런칭을 하게 되었습니다. 🎉

![이벤트 배너](/notices/images/event_banner.png)

## 이벤트 기간
* 시작: 2025-01-01
* 종료: 2025-01-31

많은 참여 부탁드립니다!
```

## 3. 리액트에서 보여주기 (구현 방법)

### A. 라이브러리 설치
HTML로 변환해주는 도구가 필요합니다.
```bash
npm install react-markdown
```

### B. 코드 수정 (`Detail` 컴포넌트)
`fetch`로 md 파일을 텍스트로 읽어온 뒤, `<ReactMarkdown>` 컴포넌트에 넣어줍니다.

```javascript
import ReactMarkdown from 'react-markdown';

// ... (API 호출 부분)
// const content = await fetch('/notices/files/notice_1.md').then(res => res.text());

return (
  <div className="markdown-body">
    <ReactMarkdown>
      {content}
    </ReactMarkdown>
  </div>
);
```

### C. 스타일링 (CSS)
기본 `h1`, `ul`, `img` 태그에 대한 스타일을 `index.css`에 추가하면 예쁘게 나옵니다.
특히 이미지는 `max-width: 100%`를 줘야 화면을 뚫고 나가지 않습니다.

```css
.markdown-body img {
  max-width: 100%;
  border-radius: 8px;
  margin: 1rem 0;
}
.markdown-body h1 {
  font-size: 1.5rem;
  color: var(--color-primary);
}
```

## 요약
1.  **이미지 가능?**: 네! `/notices/images/` 폴더에 넣고 md 파일에서 링크 걸면 됩니다.
2.  **구현 난이도**: `react-markdown` 설치하고 공지 상세 화면 코드만 조금 바꾸면 됩니다. (약 30분 소요)
