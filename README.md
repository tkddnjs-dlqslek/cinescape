# CINESCAPE

시네필을 위한 영화 촬영지 여행 지도. 영화를 검색해 3D 글로브에서 촬영지로 이동하고,
Then/Now 슬라이더로 영화 장면과 현재 모습을 비교하며, 가까운 촬영지 3곳을 동선으로 묶어 봅니다.

## 개발
```bash
npm install
npm run dev    # http://localhost:3000
npm test       # Vitest
npm run build  # 프로덕션 빌드
```

## 구조
- `data/films.json` — 손큐레이션 시드 데이터셋
- `src/lib/` — 스키마(types)·데이터(data)·지오(geo)·검색(search)·글로브 매핑(globePoints)
- `src/components/` — GlobeView, ThenNowSlider, SearchBar, ScenePanel, NearbyRoute, CinescapeApp

## 데이터 확장 (Phase 2, 별도 plan)
Wikidata SPARQL(P915+P625) + TMDB API + LLM 장면 태깅으로 반자동 인제스트.

비상업 데모. 이미지 URL은 placeholder이며 실제 스틸은 라이선스 확인 후 교체.
