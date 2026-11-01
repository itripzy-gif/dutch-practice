-- Pronunciation practice items from pages 3-6 of her recording script (vowels,
-- consonants, sound pairs like bom - boom, and sentences).
-- Run in Supabase: SQL Editor → New query → paste → Run. Safe to run more than once.

-- If the 1,000-word list was added earlier, this removes those words again
-- (only ones that haven't been recorded yet).
delete from public.phrases where note like '#____ · %' and audio_path is null;

-- Also removes the alphabet items if they were added earlier (unrecorded only).
delete from public.phrases where note like 'A01 alfabet%' and audio_path is null;

-- Adds the 50 pronunciation items (vowels, consonants, sound pairs, sentences)
-- from the front of the recording script. They appear at the top of the list.
-- Run once in Supabase: SQL Editor → New query → paste → Run. Safe to run again.
insert into public.phrases (text, note, created_at)
select v.text, v.note, now() + make_interval(secs => 50 - v.nr)
from (values
  ('man - maan', 'A02 · a / aa /ɑ/ - /aː/ · 짧고 뒤쪽인 a와, 길고 앞쪽인 aa를 구별.', 0),
  ('bed - been', 'A02 · e / ee /ɛ/ - /eː/ · 단순한 길이뿐 아니라 입을 벌리는 정도도 다름.', 1),
  ('vis - vies', 'A02 · i / ie /ɪ/ - /i/ · i는 힘을 빼고, ie는 선명한 이 계열.', 2),
  ('zon - zoon', 'A02 · o / oo /ɔ/ - /oː/ · o는 더 열고, oo는 덜 열어 길게.', 3),
  ('bus - muur', 'A02 · u / uu /ʏ/ - /y/ · 혀는 앞쪽에 두고 입술을 둥글게. r 앞 길이 주의.', 4),
  ('boek - goed - voet', 'A02 · oe /u/ · 우 계열. 철자 u와 구별.', 5),
  ('neus - leuk - deur', 'A02 · eu /øː/ · 에 계열 혀 위치를 유지하고 입술만 둥글게.', 6),
  ('huis - uit - tuin', 'A02 · ui /œy/ · 둥근 입술로 소리를 이동. 아우로 고정하지 않기.', 7),
  ('trein - klein - vijf - tijd', 'A02 · ei / ij /ɛi/ · 두 철자의 기본 소리는 같음.', 8),
  ('koud - oud - blauw - auto', 'A02 · ou / au /ɑu/ · 두 철자의 기본 소리는 같음.', 9),
  ('saai - mooi - doei', 'A02 · aai / ooi / oei /aːi/ /oːi/ /ui/ · 길게 낸 모음 뒤에 미끄러지는 소리.', 10),
  ('sneeuw - nieuw', 'A02 · eeuw / ieuw /eːu/ - /iu/ · 끝에 별도 으 모음을 붙이지 않기.', 11),
  ('de - een - maken - betalen', 'A02 · schwa /ə/ · 힘없는 모음. de와 부정관사 een은 약하게.', 12),
  ('gaan - goed - acht - nacht', 'A03 · g / ch /ɣ/ /x/ · 혀 뒤쪽 마찰음. 네덜란드 북부에서는 g도 무성화가 흔함.', 13),
  ('school - schoon - schrijven', 'A03 · sch /sx/ · s와 ch를 이어 내기. 슈 한 소리로 읽지 않기.', 14),
  ('ja - jij - jaar', 'A03 · j /j/ · 영어 yes의 첫소리 계열. 영어 j 소리와 다름.', 15),
  ('water - wij - vier - vis', 'A03 · w/v /ʋ/ - /v/ · w는 v보다 마찰을 줄임. 화자·지역 차이 있음.', 16),
  ('sap - zon - zes', 'A03 · s/z /s/ - /z/ · z는 기본적으로 성대가 울림. 일부 화자는 무성화.', 17),
  ('rood - drie - deur', 'A03 · r /r/ (varies) · 혀끝·목구멍 등 여러 표준 변이. 녹음자의 자연스러운 r 사용.', 18),
  ('huis - hand - hebben', 'A03 · h /ɦ/ · 가볍게 숨을 내기. 자료에서는 /h/로 쓰기도 함.', 19),
  ('lang - zingen - bank', 'A03 · ng / nk /ŋ/ - /ŋk/ · ng 뒤에 별도 g를 붙이지 않기. nk에는 k가 남음.', 20),
  ('sjaal - katje - beetje', 'A03 · sj / tj /ʃ/ /tj/ · tj는 실제로 합쳐져 들릴 수 있음. 자연스럽게 읽기.', 21),
  ('bal - pal', 'A03 · b/p /b/ - /p/ · 과도한 거센소리를 피하고 두 소리를 구별.', 22),
  ('dak - tak', 'A03 · d/t /d/ - /t/ · 단어 첫머리 대조. 어말 d는 보통 /t/로 남음.', 23),
  ('melk - markt - straks - herfst', 'A03 · clusters no extra vowel · 자음 사이·끝에 불필요한 으를 넣지 않기.', 24),
  ('man - maan', 'A04 · 남자 - 달 · /mɑn/ - /maːn/', 25),
  ('vis - vies', 'A04 · 생선 - 더러운 · /vɪs/ - /vis/', 26),
  ('zon - zoon', 'A04 · 태양 - 아들 · /zɔn/ - /zoːn/', 27),
  ('bot - boot', 'A04 · 뼈·무딘 - 배 · /bɔt/ - /boːt/', 28),
  ('bom - boom', 'A04 · 폭탄 - 나무 · /bɔm/ - /boːm/', 29),
  ('boek - buik', 'A04 · 책-배 · /buk/ - /bœyk/', 30),
  ('buur - boer', 'A04 · 이웃 - 농부 · /byːr/ - /buːr/', 31),
  ('bed - bedden', 'A04 · 침대 - 침대들; 끝 d와 내부 d · /bɛt/ - /ˈbɛdə(n)/', 32),
  ('hond - honden', 'A04 · 개 - 개들; 끝 d는 /t/ · /ɦɔnt/ - /ˈɦɔndə(n)/', 33),
  ('boom - bomen', 'A04 · 나무 - 나무들; 모음은 계속 길게 · /boːm/ - /ˈboːmə(n)/', 34),
  ('man - mannen', 'A04 · 남자 - 남자들; 모음은 계속 짧게 · /mɑn/ - /ˈmɑnə(n)/', 35),
  ('een - één', 'A04 · 부정관사 하나의 - 강조한 숫자 하나 · /ən/ - /eːn/', 36),
  ('maken - betalen - gelukkig', 'A05 ritme · /ˈmaːkə(n)/ /bəˈtaːlə(n)/ /ɣəˈlʏkəx/ · 강세와 슈와를 구별', 37),
  ('Ik ben moe.', 'A05 zin · 나는 피곤해요.', 38),
  ('Jij bent thuis. Ben jij thuis?', 'A05 zin · 너는 집에 있어. 너 집에 있니?', 39),
  ('Zij is hier. Zij zijn hier.', 'A05 zin · 그녀는 여기 있어요. 그들은 여기 있어요.', 40),
  ('Ik zie hem. Ik zie hen.', 'A05 zin · 나는 그를 봐요. 나는 그들을 봐요.', 41),
  ('Dit is ons huis. Dit is onze fiets.', 'A05 zin · 이것은 우리 집이에요. 이것은 우리 자전거예요.', 42),
  ('Ik geef hun een boek. Ik geef een boek aan hen.', 'A05 zin · 나는 그들에게 책을 줘요. 같은 뜻의 두 표현.', 43),
  ('Deze fiets is van mij. Die fiets is van jou.', 'A05 zin · 이 자전거는 내 거예요. 저 자전거는 네 거예요.', 44),
  ('Dit boek is nieuw. Deze boeken zijn nieuw.', 'A05 zin · 이 책은 새것이에요. 이 책들은 새것이에요.', 45),
  ('Ik sta om zeven uur op.', 'A05 zin · 나는 7시에 일어나요.', 46),
  ('De trein komt om acht uur aan.', 'A05 zin · 기차는 8시에 도착해요.', 47),
  ('Ik begrijp het niet. Kunt u dat herhalen?', 'A05 zin · 이해하지 못했어요. 다시 말씀해 주실 수 있나요?', 48),
  ('Ik wil graag een koffie.', 'A05 zin · 커피 한 잔 부탁해요.', 49)
) as v(text, note, nr)
where not exists (select 1 from public.phrases p where p.text = v.text and p.note = v.note);
