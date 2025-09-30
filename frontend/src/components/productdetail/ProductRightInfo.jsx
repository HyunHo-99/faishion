import React, {useState, useEffect} from "react";
import {useNavigate} from "react-router-dom";
import {
    Button,
    Form,
    InputGroup,
    Col,
    Card,
    Row // Row 컴포넌트 추가
} from "react-bootstrap";
import {FaHeart, FaTimes} from 'react-icons/fa';
import "../../pages/ProductDetailPage.css"
import {useAuth} from "../../contexts/AuthContext.jsx";

// 참고: alert() 대신 메시지 표시를 위한 임시 함수 (Canvas 제약사항 때문)
const showMessage = (message) => {
    console.log(message);
    // 실제 환경에서는 모달이나 토스트 알림을 사용해야 합니다.
    alert(message);
};


const ProductRightInfo = ({productId, product}) => {
    const navigate = useNavigate();
    const [selectedColor, setSelectedColor] = useState("");
    const [selectedSize, setSelectedSize] = useState("");
    const [availableSizes, setAvailableSizes] = useState([]);
    const [selectedOptions, setSelectedOptions] = useState([]);
    const {api} = useAuth();

    useEffect(() => {
        if (product && product.stockByColorAndSize) {
            const colors = Object.keys(product.stockByColorAndSize);
            if (colors.length > 0) {
                setSelectedColor("");
            }
        }
    }, [product]);

    useEffect(() => {
        if (selectedColor && product && product.stockByColorAndSize[selectedColor]) {
            const sizesForColor = Object.keys(product.stockByColorAndSize[selectedColor]);
            setAvailableSizes(sizesForColor);
            setSelectedSize("");
        }
    }, [selectedColor, product]);

    const handleAddOption = (color, size) => {
        if (color && size) {
            const existingOption = selectedOptions.find(
                (option) => option.color === color && option.size === size
            );

            // 재고 수량 확인
            const stockQuantity = product.stockByColorAndSize[color][size] || 0;

            if (existingOption) {
                // 이미 선택된 상품이면, 재고 확인 후 수량 증가
                if (existingOption.quantity < stockQuantity) {
                    const updatedOptions = selectedOptions.map(option =>
                        option.color === color && option.size === size
                            ? {...option, quantity: option.quantity + 1}
                            : option
                    );
                    setSelectedOptions(updatedOptions);
                } else {
                    showMessage("재고가 부족합니다.");
                }
            } else {
                // 새로운 조합이면 목록에 추가
                if (stockQuantity > 0) {
                    setSelectedOptions([...selectedOptions, {
                        color: color,
                        size: size,
                        quantity: 1,
                        price: product.price,
                        stockQuantity: stockQuantity
                    }]);
                } else {
                    showMessage("선택하신 상품은 재고가 없습니다.");
                }
            }

            setSelectedColor("");
            setSelectedSize("");
        }
    };

    const handleQuantityChange = (index, delta) => {
        const updatedOptions = [...selectedOptions];
        const currentQuantity = updatedOptions[index].quantity;
        const stockQuantity = updatedOptions[index].stockQuantity;
        const newQuantity = currentQuantity + delta;

        if (newQuantity > 0 && newQuantity <= stockQuantity) {
            updatedOptions[index].quantity = newQuantity;
            setSelectedOptions(updatedOptions);
        } else if (newQuantity > stockQuantity) {
            showMessage("재고 수량을 초과할 수 없습니다.");
        }
    };

    const handleRemoveOption = (index) => {
        const updatedOptions = selectedOptions.filter((_, i) => i !== index);
        setSelectedOptions(updatedOptions);
    };

    const onAIForm = () => {
        navigate(`/gemini/${productId}`);
    };

    // 바로가기 클릭 시 주문서 이동
    const onOrderForm = async () => {
        if (selectedOptions.length === 0) {
            showMessage("상품 옵션을 선택해 주세요.");
            return;
        }

        const requestBody = {
            productId: productId, // 상품 ID (DirectOrderRequestDTO.productId)
            items: selectedOptions.map(opt => ({ // OrderItemRequestDTO 리스트
                color: opt.color,
                size: opt.size,
                quantity: opt.quantity
            }))
        };

        try {
            const response = await api.post('/order/newdirect', requestBody);

            // ⭐️ 2. 응답으로 받은 주문 상품 목록(CartProductDTO 리스트)을 'directItems' 키로 전달
            navigate(`/order/new`, {
                state: {
                    directItems: response.data // ⭐️ 키 이름을 명확히 변경
                }
            });

        } catch (error) {
            console.error('바로 구매 데이터 준비 실패:', error.response?.data || error.message);
            showMessage("바로 구매를 위한 데이터를 불러오는 데 실패했습니다.");
        }
    };

    const onCartSave = async () => {
        if (selectedOptions.length === 0) {
            showMessage("상품 옵션을 선택해 주세요.");
            return;
        }

        const isValid = selectedOptions.every(option =>
            option.color && option.size && option.quantity > 0
        );

        if (!isValid) {
            showMessage("모든 상품의 색상, 사이즈, 수량을 올바르게 선택했는지 확인해 주세요.");
            return;
        }
        try {
            const stockList = selectedOptions.map(option => ({
                quantity: option.quantity,
                color: option.color,
                size: option.size,
                productId: productId
            }));

            const response = await api.post('/cart/save', stockList);
            if (response) {
                showMessage("카트 상품이 담겼습니다.");
                setSelectedOptions([]);
            }
        } catch (error) {
            console.error('Error fetching banner data:', error);
            // 에러 처리 메시지 추가
            showMessage("장바구니 담기에 실패했습니다.");
        }
    };

    const formatPrice = (price) => {
        if (price === null || price === undefined || isNaN(price)) {
            return "0";
        }
        return price.toLocaleString("ko-KR");
    };

    const onWishSave = async () => {
        try {
            const response = await api.post(`/wish/save/${productId}`);
            showMessage(response.data);
        } catch (error) {
            console.error('Error fetching banner data:', error);
            // 에러 처리 메시지 추가
            showMessage("위시리스트 추가에 실패했습니다.");
        }
    };

    const totalQuantity = selectedOptions.reduce((sum, option) => sum + option.quantity, 0);
    const totalPrice = selectedOptions.reduce((sum, option) => sum + (option.price * option.quantity), 0);

    const currentProduct = product;
    if (!currentProduct) {
        return <div>상품 정보를 로드 중입니다...</div>;
    }

    const isDiscounting = currentProduct.originalPrice > currentProduct.price;

    const availableColors = currentProduct.stockByColorAndSize
        ? Object.keys(currentProduct.stockByColorAndSize)
        : [];

    return (
        <div className="ProductRightInfo p-2 p-md-0">
            {/* 상단 뱃지 영역 (무료 배송, 무료 포장) */}
            <div className="d-flex mb-2">
                <span className="badge bg-light text-dark border me-1 fw-normal" style={{fontSize: '0.75rem'}}>
                    무료배송
                </span>
                <span className="badge bg-light text-dark border fw-normal" style={{fontSize: '0.75rem'}}>
                    무료포장
                </span>
            </div>

            {/* 상품 정보 영역 */}
            <div className="product-header mb-3">
                <p className="brand-name fw-bold mb-1" style={{fontSize: '1.1rem'}}>
                    {currentProduct.brand}
                </p>
                <h2 className="product-name fw-normal" style={{fontSize: '1.5rem'}}>
                    {currentProduct.name}
                </h2>
            </div>

            {/* 가격 및 할인 영역 (이미지 디자인 반영) */}
            <div className="price-info mb-3">
                {/* 원가 (취소선) */}
                {isDiscounting && (
                    <p className="text-decoration-line-through text-muted mb-0 me-2" style={{fontSize: '1rem'}}>
                        {formatPrice(currentProduct.originalPrice)}원
                    </p>
                )}
                <div className="d-flex align-items-center mb-1">
                    {/* 할인율 및 최종 가격 */}
                    {isDiscounting ? (
                        <div className="d-flex align-items-center">
                            <h3 className="fw-bold me-2" style={{color: '#1850DB', fontSize: '1.5rem'}}>
                                {currentProduct.discountRate}%
                            </h3>
                            <h3 className="final-price fw-bold" style={{fontSize: '1.3rem'}}>
                                {formatPrice(currentProduct.price)}원
                            </h3>
                        </div>
                    ) : (
                        <h3 className="final-price fw-bold" style={{fontSize: '1.75rem'}}>
                            {formatPrice(currentProduct.price)}원
                        </h3>
                    )}
                </div>
            </div>

            {/* AI로 옷 입어보기 버튼 (가격 영역 오른쪽에 배치) */}
            <div className="d-flex justify-content-end mb-3">
                <Button
                    variant="outline-primary"
                    onClick={onAIForm}
                    className="fw-bold"
                    style={{
                        backgroundColor: '#FFF',
                        borderColor: '#1850DB',
                        color: '#1850DB'
                    }}
                >
                    AI로 옷 입어보기
                </Button>
            </div>


            {/* 부가 정보 (카드 혜택, 포인트 적립, 배송 방식) */}
            <hr className="my-3"/>
            <div className="additional-info mb-4" style={{fontSize: '0.875rem'}}>
                <Row>
                    <Col xs={3} className="text-muted">배송 방법</Col>
                    <Col xs={9}>
                        <strong className="me-2">택배배송</strong>
                        <span className="text-muted me-2" style={{cursor: 'pointer'}}>
                            ⓘ
                        </span>
                        무료배송 <br/>14시 이전 주문 시 오늘 출고 예정
                    </Col>
                </Row>
            </div>
            <hr className="my-3"/>

            {/* 색상 선택 셀렉트 박스 */}
            <div className="mb-3">
                <p className="fw-bold">색상</p>
                <Form.Select aria-label="색상 선택"
                             value={selectedColor}
                             onChange={(e) => {
                                 setSelectedColor(e.target.value);
                                 setSelectedSize("");
                             }}
                >
                    <option value="">색상 선택</option>
                    {product.stockByColorAndSize && Object.keys(product.stockByColorAndSize).map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </Form.Select>
            </div>
            <div className="mb-3">
                <p className="fw-bold">사이즈</p>
                <Form.Select
                    aria-label="사이즈 선택"
                    value={selectedSize}
                    onChange={(e) => {
                        const newSize = e.target.value;
                        setSelectedSize(newSize);
                        if (selectedColor && newSize) {
                            handleAddOption(selectedColor, newSize);
                            setSelectedColor("");
                            setSelectedSize("");
                        }
                    }}
                    disabled={!selectedColor}
                >
                    <option value="">사이즈 선택</option>
                    {availableSizes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </Form.Select>
            </div>
            <hr/>

            {/* 선택된 상품 목록 표시 영역 */}
            <div className="selected-items-container">
                {selectedOptions.map((option, index) => (
                    <Card key={index} className="mb-2 p-2">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                                <div>
                                    <strong>{option.color} · {option.size}</strong>
                                </div>
                            </div>
                            <Button variant="light" size="sm" onClick={() => handleRemoveOption(index)}>
                                <FaTimes/>
                            </Button>
                        </div>
                        <div className="d-flex align-items-center justify-content-between mt-2">
                            <InputGroup style={{width: '120px'}}>
                                <Button variant="outline-secondary"
                                        onClick={() => handleQuantityChange(index, -1)}>-</Button>
                                <Form.Control
                                    aria-label="Quantity"
                                    value={option.quantity}
                                    className="text-center"
                                />
                                <Button variant="outline-secondary"
                                        onClick={() => handleQuantityChange(index, 1)}>+</Button>
                            </InputGroup>
                            <div className="text-end">
                                <small className="text-muted">재고: {option.stockQuantity}개</small>
                                <h5 className="mb-0 fw-bold">
                                    {formatPrice(option.price * option.quantity)}원
                                </h5>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            {/* 총 금액 영역 (이미지 디자인 반영) */}
            {selectedOptions.length > 0 && (
                <div className="d-flex justify-content-between align-items-center mt-3 p-3">
                    <h5 className="mb-0 fw-bold">총 금액</h5>
                    <h4 className="mb-0 fw-bold" style={{fontSize: '1.3rem'}}>{formatPrice(totalPrice)}원</h4>
                </div>
            )}


            {/* 버튼 영역 (이미지 디자인 반영) */}
            <div className="d-grid gap-2 mt-4">
                <div className="d-flex ">
                    {/* 좋아요 버튼 (위시) */}
                    <div className="col-3 me-2">
                        <Button
                            variant="secondary"
                            size="lg"
                            onClick={onWishSave}
                            className="w-100 border-0 "
                            style={{
                                height: '56px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <FaHeart color="lightgray" size={16}/>
                        </Button>
                    </div>
                    {/* 장바구니 버튼 */}
                        <Button
                            variant="dark"
                            size="lg"
                            onClick={onCartSave}
                            className="w-100"
                            style={{height: '56px', fontSize: '1.1rem'}}
                        >
                            장바구니
                        </Button>
                </div>
                {/* 바로 구매 버튼 */}
                <Button
                    variant="primary"
                    size="lg"
                    onClick={onOrderForm}
                    className="w-100"
                    style={{
                        height: '56px',
                        backgroundColor: '#1850DB',
                        borderColor: '#1850DB',
                        fontSize: '1.1rem'
                    }}
                >
                    바로 구매
                </Button>
            </div>

        </div>
    );
};

export default ProductRightInfo;
