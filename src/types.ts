export interface EventState {
  status: 'waiting' | 'countdown' | 'running' | 'finished';
  targetClicks: number;
  duration: number; // in seconds
  countdownDuration: number; // in seconds
  totalClicks: number;
  actualProgress: number; // 0.0 ~ 1.0
  screenProgress: number; // 0.0 ~ 1.0
  startedAt: number | null;
  runStartedAt: number | null;
  activeUsers: number;
  serverTime: number;
  isVirtualEnabled?: boolean;
  customImagesVersion?: number;
  standbyImageVersion?: number;
}

export interface ClientSyncResponse extends EventState {
  // Can extend if needed
}

export interface ImageLayer {
  id: number;
  key: string;
  name: string;
  description: string;
  fileName: string;
  threshold: number; // progress percentage (0 to 100)
}

export const IMAGE_LAYERS: ImageLayer[] = [
  { id: 1, key: 'produce', name: '풍요로운 농산물 상자', description: '배추, 토마토, 딸기, 사과 등 대표 원예농산물 수확', fileName: '01_produce.webp', threshold: 0 },
  { id: 2, key: 'flowers', name: '아름다운 화훼 및 특용작물', description: '백합, 난, 인삼 등 고부가 약용 작물', fileName: '02_flowers_herbs.webp', threshold: 10 },
  { id: 3, key: 'orchard', name: '싱그러운 과수원', description: '주렁주렁 탐스럽게 결실을 맺은 사과·배 과수원', fileName: '03_orchard.webp', threshold: 20 },
  { id: 4, key: 'field', name: '정돈된 시험포장', description: '안정 생산기술을 연구하는 줄 맞춰 가꾸어진 노지 채소밭', fileName: '04_field.webp', threshold: 30 },
  { id: 5, key: 'greenhouse', name: '최첨단 스마트 유리온실', description: '생육 환경을 정밀 제어하는 현대적인 유리온실 프레임', fileName: '05_greenhouse.webp', threshold: 40 },
  { id: 6, key: 'researchers', name: '미래를 연구하는 연구원', description: '작물의 신품종 개발 및 생육 품질을 연구하는 박사들', fileName: '06_researchers.webp', threshold: 50 },
  { id: 7, key: 'sensors', name: '정밀 환경·기상 센서', description: '온실과 시험포장에 설치된 스마트 토양·생육 모니터링 센서', fileName: '07_sensors.webp', threshold: 60 },
  { id: 8, key: 'hydroponics', name: '순환식 첨단 수경재배', description: '환경 오염을 줄이고 생산성을 높이는 수경재배 및 양액 공급 시스템', fileName: '08_hydroponics.webp', threshold: 70 },
  { id: 9, key: 'robot', name: '자율주행 농업로봇', description: '포장 사이를 스스로 주행하며 제초·방제·생육 조사를 돕는 로봇', fileName: '09_robot.webp', threshold: 80 },
  { id: 10, key: 'drones', name: '원격 생육 모니터링 드론', description: '하늘에서 과수원 전체의 생육 상태를 분석하는 모니터링 드론', fileName: '10_drones.webp', threshold: 90 },
  { id: 11, key: 'datalines', name: '은은한 데이터 연결망', description: '모든 농작물과 첨단 장비를 원활하게 이어주는 초정밀 정보망', fileName: '11_data_lines.webp', threshold: 92 },
  { id: 12, key: 'farmers', name: '기술을 적용하는 농업인', description: '연구 성과를 현장에 신속하게 보급받아 만족해하는 농업인들', fileName: '12_farmers.webp', threshold: 95 },
  { id: 13, key: 'table', name: '건강한 온가족 국민 식탁', description: '우리 기술로 가꾸어 신뢰할 수 있는 맛있는 원예 특작 식탁', fileName: '13_healthy_table.webp', threshold: 98 },
  { id: 14, key: 'vision', name: '비전 선포 엠블럼 및 문구', description: '“원예특작 과학기술 혁신으로 국민식탁은 건강하게, 농업은 풍요롭게”', fileName: '14_vision_text.webp', threshold: 100 }
];
