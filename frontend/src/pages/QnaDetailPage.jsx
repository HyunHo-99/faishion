import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
// 💡 useAuth 훅 추가
import { useAuth } from "../contexts/AuthContext.jsx";
import "./QnaDetailPage.css";

const QnaDetailPage = () => {
    const { qnaId } = useParams(); // id 받음
    const navigate = useNavigate();
    // 💡 useAuth 훅 사용: api 인스턴스와 user 정보 가져오기
    const { api, user } = useAuth();

    const [qna, setQna] = useState(null); // 사용자가 보고 있는 게시물 데이터
    const [loading, setLoading] = useState(true); // 로딩 관리
    const [error, setError] = useState(null); // 에러 관리
    const [isEditing, setIsEditing] = useState(false); // 수정 상태 관리
    const [editedTitle, setEditedTitle] = useState(""); // 수정될 제목
    const [editedContent, setEditedContent] = useState(""); // 수정될 내용

    // --- 답글 기능 ---
    const [answer, setAnswer] = useState(""); // 답변 내용 상태

    // 💡 권한 체크 편의 변수
    // roles는 배열이므로 includes 사용
    const hasAnswerPermission = user.roles && (user.roles.includes('ADMIN') || user.roles.includes('SELLER'));
    const isAuthor = qna && user.sub === qna.user_id; // 작성자 ID와 로그인 ID 일치 여부 확인

    useEffect(() => {
        let ignore = false;

        const fetchQnaDetail = async () => {
            try {
                // 💡 api 사용 (인증된 요청)
                // 현재 백엔드 URL이 명시되어 있지 않으므로, api.defaults.baseURL을 사용한다고 가정하고 상대 경로를 사용합니다.
                const res = await api.get(`/qna/${qnaId}`);
                if (!ignore) {
                    setQna(res.data);
                    // 상세보기 데이터 불러온 후 useState에 저장
                    setEditedTitle(res.data.title);
                    setEditedContent(res.data.content);
                }
            } catch (e) {
                if (!ignore) setError(e);
            } finally {
                if (!ignore) setLoading(false);
            }
        };

        fetchQnaDetail();
        return () => {
            ignore = true;
        };
    }, [qnaId, api]); // api를 의존성 배열에 추가


    // 수정 완료 버튼 클릭 시 호출될 함수
    const handleUpdate = async () => {
        try {
            // 💡 api 사용 (인증된 요청)
            await api.put(`/qna/${qnaId}`, {
                title: editedTitle,
                content: editedContent,
            });
            alert("게시글이 수정되었습니다.");
            setIsEditing(false); // 수정 상태
            // 💡 api 사용
            const res = await api.get(`/qna/${qnaId}`); // 현재 qnaId를 가져옴
            setQna(res.data);
        } catch (e) {
            setError(e);
            alert("수정 실패");
        }
    };

    // 삭제 버튼 클릭 시 호출될 함수
    const handleDelete = async () => {
        if (window.confirm("정말 삭제하시겠습니까?")) {
            try {
                // 💡 api 사용 (인증된 요청)
                await api.delete(`/qna/${qnaId}`);
                alert("삭제가 완료되었습니다.");

                // 삭제 성공 후, 목록 페이지로 이동
                navigate("/qna/list");

            } catch (e) {
                setError(e);
                alert("삭제 실패");
                // 삭제 실패해도 목록으로 이동
                navigate("/qna/list");
            }
        }
    };

    // 로딩 및 에러 처리
    if (loading) return <section className="qa-form"><div className="qa-inner">불러오는 중…</div></section>;
    if (error) return <section className="qa-form"><div className="qa-inner">불러오기 실패</div></section>;
    if (!qna) return <section className="qa-form"><div className="qa-inner">데이터 없음</div></section>;

    // 답변 등록 버튼 클릭 시 호출될 함수
    const handleAnswerSubmit = async () => {

        if (!answer.trim()) {
            alert("답변 내용을 입력해주세요.");
            return;
        }
        try {
            // 💡 api 사용 (인증된 요청)
            await api.put(`/qna/answer/${qnaId}`, {
                answer: answer // QnaAnswerDTO에 맞게 JSON 바디 전송
            });
            alert("답변이 등록되었습니다.");

            // 💡 api 사용
            const res = await api.get(`/qna/${qnaId}`);
            setQna(res.data);
            setAnswer(""); // 답변 폼 초기화

        } catch (e) {
            console.error("답변 등록 실패:", e);
            // 백엔드에서 403 Forbidden 응답이 올 경우 (권한 없음)
            const errorMessage = e.response && e.response.status === 403
                ? "답변 권한이 없습니다."
                : "답변 등록 중 오류가 발생했습니다.";
            setError(e);
            alert(errorMessage);
        }
    };

    return (
        <>
            <section className="qa-form">
                <div className="qa-inner">
                    <h1>Q&A</h1>
                    <div className="info-row">
                        <div>작성자 {qna.user_id}</div>
                        <div>
                            작성일 {new Date(qna.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                        }).replace(/\. /g, '.').slice(0, -1)}
                        </div>
                    </div>
                    <div className="mb-3">
                        <label className="form-label">제목</label>
                        {isEditing ? (
                            <input
                                type="text"
                                className="form-control"
                                value={editedTitle}
                                onChange={(e) => setEditedTitle(e.target.value)}
                            />
                        ) : (
                            <p className="form-control-plaintext">{qna.title}</p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label className="form-label">내용</label>
                        {isEditing ? (
                            <textarea
                                className="form-control"
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                            ></textarea>
                        ) : (
                            <p className="form-control-plaintext">{qna.content}</p>
                        )}
                    </div>

                    <div className="btn-group">
                        {/* 💡 수정/삭제 버튼: 작성자(isAuthor)만 보이도록 */}
                        {isAuthor ? (
                            isEditing ? (
                                <>
                                    <button className="btn btn-primary" onClick={handleUpdate}>수정 완료</button>
                                    <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>취소</button>
                                </>
                            ) : (
                                <>
                                    <button className="btn btn-primary" onClick={handleDelete}>삭제</button>
                                    <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>수정</button>
                                    <button className="btn btn-secondary" onClick={() => navigate("/qna/list")}>목록</button>
                                </>
                            )
                        ) : (
                            <button className="btn btn-secondary" onClick={() => navigate("/qna/list")}>목록</button>
                        )}
                    </div>

                    {/* 답변 영역 */}
                    <div className="answer-section">
                        <label className="form-label">답변</label>
                        {qna.answer ? (
                            // 이미 답변이 있을 경우
                            <div className="answer-box">
                                <p>{qna.answer}</p>
                                <small className="answered-by">
                                    답변자: {qna.answered_by || '관리자/판매자'} {/* DTO에서 answered_by를 내려줘야 합니다. */}
                                </small>
                            </div>
                        ) : (
                            // 💡 답변이 없을 경우: ADMIN 또는 SELLER 권한이 있는 경우에만 답변 폼 표시
                            hasAnswerPermission ? (
                                <div className="answer-form">
                                    <textarea
                                        className="form-control"
                                        onChange={(e) => setAnswer(e.target.value)}
                                        placeholder="답변 내용을 입력하세요..."
                                        value={answer} // 입력 값 상태 연결
                                    ></textarea>
                                    <button className="btn btn-primary" onClick={handleAnswerSubmit}>답변 등록</button>
                                </div>
                            ) : (
                                // 일반 사용자나 답변 권한이 없는 경우
                                <p className="text-muted">아직 답변이 등록되지 않았습니다.</p>
                            )
                        )}
                    </div>
                </div>
            </section>
        </>
    );
};

export default QnaDetailPage;