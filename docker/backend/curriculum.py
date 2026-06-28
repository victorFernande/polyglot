A1_UNITS = [
    {
        "title": "Fazendo um pedido no café",
        "goal": "Pedir bebida/comida simples, usar cortesia e entender preços básicos.",
        "topics": ["cumprimentar", "pedir café", "pedir água", "pedir comida", "usar por favor", "agradecer", "perguntar preço", "pedir a conta", "confirmar pedido", "despedir-se"],
        "phrases": {
            "de": [("Olá", "Hallo"), ("Eu gostaria de um café.", "Ich möchte einen Kaffee."), ("Uma água, por favor.", "Ein Wasser, bitte."), ("Eu gostaria de um pão.", "Ich möchte ein Brot."), ("Por favor.", "Bitte."), ("Obrigado.", "Danke."), ("Quanto custa?", "Wie viel kostet das?"), ("A conta, por favor.", "Die Rechnung, bitte."), ("Sim, está certo.", "Ja, das stimmt."), ("Até logo.", "Auf Wiedersehen.")],
            "fr": [("Olá", "Bonjour"), ("Eu gostaria de um café.", "Je voudrais un café."), ("Uma água, por favor.", "Une eau, s'il vous plaît."), ("Eu gostaria de um pão.", "Je voudrais du pain."), ("Por favor.", "S'il vous plaît."), ("Obrigado.", "Merci."), ("Quanto custa?", "Ça coûte combien ?"), ("A conta, por favor.", "L'addition, s'il vous plaît."), ("Sim, está certo.", "Oui, c'est correct."), ("Até logo.", "Au revoir.")],
            "ru": [("Olá", "Здравствуйте"), ("Eu gostaria de um café.", "Я хочу кофе."), ("Uma água, por favor.", "Воду, пожалуйста."), ("Eu gostaria de pão.", "Я хочу хлеб."), ("Por favor.", "Пожалуйста."), ("Obrigado.", "Спасибо."), ("Quanto custa?", "Сколько это стоит?"), ("A conta, por favor.", "Счёт, пожалуйста."), ("Sim, está certo.", "Да, правильно."), ("Até logo.", "До свидания.")],
            "jp": [("Olá", "こんにちは"), ("Eu gostaria de um café.", "コーヒーをお願いします。"), ("Uma água, por favor.", "水をお願いします。"), ("Eu gostaria de pão.", "パンをお願いします。"), ("Por favor.", "お願いします。"), ("Obrigado.", "ありがとうございます。"), ("Quanto custa?", "いくらですか。"), ("A conta, por favor.", "お会計をお願いします。"), ("Sim, está certo.", "はい、合っています。"), ("Até logo.", "さようなら。")],
            "en": [("Olá", "Hello"), ("Eu gostaria de um café.", "I would like a coffee."), ("Uma água, por favor.", "A water, please."), ("Eu gostaria de pão.", "I would like bread."), ("Por favor.", "Please."), ("Obrigado.", "Thank you."), ("Quanto custa?", "How much is it?"), ("A conta, por favor.", "The bill, please."), ("Sim, está certo.", "Yes, that is correct."), ("Até logo.", "Goodbye.")],
        },
    },
    {
        "title": "Apresente-se",
        "goal": "Dizer nome, origem, moradia, idioma, profissão/estudo e hobbies.",
        "topics": ["dizer nome", "dizer origem", "dizer moradia", "dizer idioma", "dizer profissão", "dizer estudo", "perguntar nome", "perguntar origem", "falar hobby", "encerrar apresentação"],
        "phrases": {
            "de": [("Meu nome é Victor.", "Ich heiße Victor."), ("Eu sou do Brasil.", "Ich komme aus Brasilien."), ("Eu moro em São Paulo.", "Ich wohne in São Paulo."), ("Eu falo português.", "Ich spreche Portugiesisch."), ("Eu sou professor.", "Ich bin Lehrer."), ("Eu estudo alemão.", "Ich lerne Deutsch."), ("Como você se chama?", "Wie heißt du?"), ("De onde você é?", "Woher kommst du?"), ("Eu gosto de música.", "Ich mag Musik."), ("Prazer em conhecer você.", "Freut mich.")],
            "fr": [("Meu nome é Victor.", "Je m'appelle Victor."), ("Eu sou do Brasil.", "Je viens du Brésil."), ("Eu moro em São Paulo.", "J'habite à São Paulo."), ("Eu falo português.", "Je parle portugais."), ("Eu sou professor.", "Je suis professeur."), ("Eu estudo francês.", "J'apprends le français."), ("Como você se chama?", "Comment tu t'appelles ?"), ("De onde você é?", "Tu viens d'où ?"), ("Eu gosto de música.", "J'aime la musique."), ("Prazer em conhecer você.", "Enchanté.")],
            "ru": [("Meu nome é Victor.", "Меня зовут Виктор."), ("Eu sou do Brasil.", "Я из Бразилии."), ("Eu moro em São Paulo.", "Я живу в Сан-Паулу."), ("Eu falo português.", "Я говорю по-португальски."), ("Eu sou professor.", "Я преподаватель."), ("Eu estudo russo.", "Я учу русский."), ("Como você se chama?", "Как тебя зовут?"), ("De onde você é?", "Откуда ты?"), ("Eu gosto de música.", "Я люблю музыку."), ("Prazer em conhecer você.", "Очень приятно.")],
            "jp": [("Meu nome é Victor.", "私の名前はビクトルです。"), ("Eu sou do Brasil.", "ブラジル出身です。"), ("Eu moro em São Paulo.", "サンパウロに住んでいます。"), ("Eu falo português.", "ポルトガル語を話します。"), ("Eu sou professor.", "私は先生です。"), ("Eu estudo japonês.", "日本語を勉強しています。"), ("Como você se chama?", "お名前は何ですか。"), ("De onde você é?", "どこの出身ですか。"), ("Eu gosto de música.", "音楽が好きです。"), ("Prazer em conhecer você.", "よろしくお願いします。")],
            "en": [("Meu nome é Victor.", "My name is Victor."), ("Eu sou do Brasil.", "I am from Brazil."), ("Eu moro em São Paulo.", "I live in São Paulo."), ("Eu falo português.", "I speak Portuguese."), ("Eu sou professor.", "I am a teacher."), ("Eu estudo inglês.", "I study English."), ("Como você se chama?", "What is your name?"), ("De onde você é?", "Where are you from?"), ("Eu gosto de música.", "I like music."), ("Prazer em conhecer você.", "Nice to meet you.")],
        },
    },
]

_UNIT_SPECS = [
    ("Converse sobre viagem", "Falar de destino, passagem, hotel, estação e ajuda.", ["destino", "passagem", "hotel", "estação", "mapa", "transporte", "horário", "bagagem", "ajuda", "chegada"]),
    ("Peça em um restaurante", "Reservar mesa, pedir comida, bebida e conta.", ["mesa", "menu", "entrada", "prato", "bebida", "sobremesa", "sem carne", "recomendação", "conta", "agradecer"]),
    ("Compartilhe contato", "Trocar telefone, e-mail, endereço e redes sociais.", ["telefone", "email", "endereço", "nome", "sobrenome", "número", "repetir", "soletrar", "mensagem", "contato"]),
    ("Fale de sua família", "Apresentar familiares, idade, posse e relações.", ["mãe", "pai", "irmão", "irmã", "filho", "filha", "avós", "idade", "posse", "descrição"]),
    ("Converse sobre o trabalho, use o tempo presente", "Dizer profissão, local de trabalho, rotina e ações no presente.", ["profissão", "empresa", "local", "horário", "reunião", "computador", "ensinar", "estudar", "trabalhar", "descanso"]),
    ("Descreva roupas", "Falar de cores, tamanhos, preço e roupas do dia a dia.", ["camisa", "calça", "sapato", "casaco", "cor", "tamanho", "preço", "provar", "comprar", "gostar"]),
    ("Converse sobre hábitos", "Falar de rotina, frequência, horários e ações comuns.", ["acordar", "café da manhã", "trabalho", "estudo", "almoço", "exercício", "noite", "fim de semana", "sempre", "às vezes"]),
    ("Exponha preferências", "Expressar gosto, não gosto, preferência e opinião simples.", ["gostar", "não gostar", "preferir", "comida", "música", "filme", "esporte", "cidade", "clima", "opinião"]),
]

_TRANSLATIONS = {
    "de": {
        "Converse sobre viagem": ["Ich reise nach Berlin.", "Ich brauche ein Ticket.", "Ich habe ein Hotel.", "Wo ist der Bahnhof?", "Ich brauche eine Karte.", "Ich nehme den Zug.", "Wann fährt der Bus?", "Das ist mein Gepäck.", "Ich brauche Hilfe.", "Ich komme heute an."],
        "Peça em um restaurante": ["Ich habe einen Tisch.", "Die Speisekarte, bitte.", "Ich nehme eine Suppe.", "Ich nehme das Hähnchen.", "Ich möchte Wasser.", "Ich möchte ein Dessert.", "Ohne Fleisch, bitte.", "Was empfehlen Sie?", "Die Rechnung, bitte.", "Vielen Dank."],
        "Compartilhe contato": ["Meine Telefonnummer ist eins zwei drei.", "Meine E-Mail ist hier.", "Das ist meine Adresse.", "Mein Name ist Victor.", "Mein Nachname ist Fernandes.", "Die Nummer ist vier fünf sechs.", "Können Sie das wiederholen?", "Ich buchstabiere meinen Namen.", "Ich schreibe eine Nachricht.", "Hier ist mein Kontakt."],
        "Fale de sua família": ["Das ist meine Mutter.", "Das ist mein Vater.", "Ich habe einen Bruder.", "Ich habe eine Schwester.", "Mein Sohn ist hier.", "Meine Tochter ist klein.", "Meine Großeltern wohnen hier.", "Meine Mutter ist fünfzig Jahre alt.", "Das ist mein Haus.", "Meine Familie ist groß."],
        "Converse sobre o trabalho, use o tempo presente": ["Ich bin Lehrer.", "Ich arbeite in einer Schule.", "Ich arbeite hier.", "Ich arbeite von neun bis fünf.", "Ich habe eine Besprechung.", "Ich benutze den Computer.", "Ich unterrichte Deutsch.", "Ich lerne jeden Tag.", "Ich arbeite heute.", "Ich mache eine Pause."],
        "Descreva roupas": ["Das Hemd ist blau.", "Die Hose ist schwarz.", "Die Schuhe sind neu.", "Der Mantel ist warm.", "Die Farbe ist schön.", "Die Größe ist klein.", "Der Preis ist gut.", "Ich probiere das an.", "Ich kaufe das Hemd.", "Ich mag diese Jacke."],
        "Converse sobre hábitos": ["Ich stehe früh auf.", "Ich frühstücke um acht.", "Ich arbeite am Morgen.", "Ich lerne am Abend.", "Ich esse zu Mittag.", "Ich mache Sport.", "Am Abend lese ich.", "Am Wochenende ruhe ich mich aus.", "Ich lerne immer.", "Manchmal koche ich."],
        "Exponha preferências": ["Ich mag Kaffee.", "Ich mag keinen Fisch.", "Ich bevorzuge Tee.", "Ich mag brasilianisches Essen.", "Ich höre gern Musik.", "Ich sehe gern Filme.", "Ich mag Fußball.", "Ich mag diese Stadt.", "Ich mag warmes Wetter.", "Ich finde das gut."],
    },
    "fr": {
        "Converse sobre viagem": ["Je voyage à Paris.", "J'ai besoin d'un billet.", "J'ai un hôtel.", "Où est la gare ?", "J'ai besoin d'une carte.", "Je prends le train.", "Le bus part quand ?", "C'est mon bagage.", "J'ai besoin d'aide.", "J'arrive aujourd'hui."],
        "Peça em um restaurante": ["J'ai une table.", "Le menu, s'il vous plaît.", "Je prends une soupe.", "Je prends le poulet.", "Je voudrais de l'eau.", "Je voudrais un dessert.", "Sans viande, s'il vous plaît.", "Vous recommandez quoi ?", "L'addition, s'il vous plaît.", "Merci beaucoup."],
        "Compartilhe contato": ["Mon numéro est un deux trois.", "Mon e-mail est ici.", "C'est mon adresse.", "Je m'appelle Victor.", "Mon nom de famille est Fernandes.", "Le numéro est quatre cinq six.", "Vous pouvez répéter ?", "J'épelle mon nom.", "J'écris un message.", "Voici mon contact."],
        "Fale de sua família": ["C'est ma mère.", "C'est mon père.", "J'ai un frère.", "J'ai une sœur.", "Mon fils est ici.", "Ma fille est petite.", "Mes grands-parents habitent ici.", "Ma mère a cinquante ans.", "C'est ma maison.", "Ma famille est grande."],
        "Converse sobre o trabalho, use o tempo presente": ["Je suis professeur.", "Je travaille dans une école.", "Je travaille ici.", "Je travaille de neuf heures à cinq heures.", "J'ai une réunion.", "J'utilise l'ordinateur.", "J'enseigne le français.", "J'étudie chaque jour.", "Je travaille aujourd'hui.", "Je fais une pause."],
        "Descreva roupas": ["La chemise est bleue.", "Le pantalon est noir.", "Les chaussures sont neuves.", "Le manteau est chaud.", "La couleur est belle.", "La taille est petite.", "Le prix est bon.", "J'essaie ça.", "J'achète la chemise.", "J'aime cette veste."],
        "Converse sobre hábitos": ["Je me lève tôt.", "Je prends le petit déjeuner à huit heures.", "Je travaille le matin.", "J'étudie le soir.", "Je déjeune.", "Je fais du sport.", "Le soir, je lis.", "Le week-end, je me repose.", "J'étudie toujours.", "Parfois, je cuisine."],
        "Exponha preferências": ["J'aime le café.", "Je n'aime pas le poisson.", "Je préfère le thé.", "J'aime la cuisine brésilienne.", "J'aime écouter de la musique.", "J'aime regarder des films.", "J'aime le football.", "J'aime cette ville.", "J'aime le temps chaud.", "Je trouve ça bien."],
    },
    "ru": {
        "Converse sobre viagem": ["Я еду в Москву.", "Мне нужен билет.", "У меня есть отель.", "Где вокзал?", "Мне нужна карта.", "Я еду на поезде.", "Когда автобус?", "Это мой багаж.", "Мне нужна помощь.", "Я приезжаю сегодня."],
        "Peça em um restaurante": ["У меня есть столик.", "Меню, пожалуйста.", "Я возьму суп.", "Я возьму курицу.", "Я хочу воду.", "Я хочу десерт.", "Без мяса, пожалуйста.", "Что вы рекомендуете?", "Счёт, пожалуйста.", "Большое спасибо."],
        "Compartilhe contato": ["Мой номер один два три.", "Мой имейл здесь.", "Это мой адрес.", "Меня зовут Виктор.", "Моя фамилия Фернандес.", "Номер четыре пять шесть.", "Повторите, пожалуйста.", "Я диктую своё имя.", "Я пишу сообщение.", "Вот мой контакт."],
        "Fale de sua família": ["Это моя мама.", "Это мой папа.", "У меня есть брат.", "У меня есть сестра.", "Мой сын здесь.", "Моя дочь маленькая.", "Мои бабушка и дедушка живут здесь.", "Моей маме пятьдесят лет.", "Это мой дом.", "Моя семья большая."],
        "Converse sobre o trabalho, use o tempo presente": ["Я преподаватель.", "Я работаю в школе.", "Я работаю здесь.", "Я работаю с девяти до пяти.", "У меня встреча.", "Я использую компьютер.", "Я преподаю русский.", "Я учусь каждый день.", "Я работаю сегодня.", "Я делаю перерыв."],
        "Descreva roupas": ["Рубашка синяя.", "Брюки чёрные.", "Обувь новая.", "Пальто тёплое.", "Цвет красивый.", "Размер маленький.", "Цена хорошая.", "Я примеряю это.", "Я покупаю рубашку.", "Мне нравится эта куртка."],
        "Converse sobre hábitos": ["Я встаю рано.", "Я завтракаю в восемь.", "Я работаю утром.", "Я учусь вечером.", "Я обедаю.", "Я занимаюсь спортом.", "Вечером я читаю.", "В выходные я отдыхаю.", "Я всегда учусь.", "Иногда я готовлю."],
        "Exponha preferências": ["Я люблю кофе.", "Я не люблю рыбу.", "Я предпочитаю чай.", "Я люблю бразильскую еду.", "Я люблю слушать музыку.", "Я люблю смотреть фильмы.", "Я люблю футбол.", "Мне нравится этот город.", "Я люблю тёплую погоду.", "Я думаю, это хорошо."],
    },
    "jp": {
        "Converse sobre viagem": ["東京へ旅行します。", "切符が必要です。", "ホテルがあります。", "駅はどこですか。", "地図が必要です。", "電車に乗ります。", "バスはいつ出ますか。", "これは私の荷物です。", "助けが必要です。", "今日着きます。"],
        "Peça em um restaurante": ["席があります。", "メニューをお願いします。", "スープをお願いします。", "チキンをお願いします。", "水をお願いします。", "デザートをお願いします。", "肉なしでお願いします。", "おすすめは何ですか。", "お会計をお願いします。", "ありがとうございます。"],
        "Compartilhe contato": ["私の電話番号は一二三です。", "私のメールはこれです。", "これは私の住所です。", "私の名前はビクトルです。", "私の名字はフェルナンデスです。", "番号は四五六です。", "もう一度お願いします。", "名前をつづります。", "メッセージを書きます。", "これが私の連絡先です。"],
        "Fale de sua família": ["これは私の母です。", "これは私の父です。", "兄弟がいます。", "姉妹がいます。", "息子はここにいます。", "娘は小さいです。", "祖父母はここに住んでいます。", "母は五十歳です。", "これは私の家です。", "私の家族は大きいです。"],
        "Converse sobre o trabalho, use o tempo presente": ["私は先生です。", "学校で働いています。", "ここで働いています。", "九時から五時まで働きます。", "会議があります。", "コンピューターを使います。", "日本語を教えます。", "毎日勉強します。", "今日は働きます。", "休憩します。"],
        "Descreva roupas": ["シャツは青いです。", "ズボンは黒いです。", "靴は新しいです。", "コートは暖かいです。", "色はきれいです。", "サイズは小さいです。", "値段はいいです。", "これを試着します。", "シャツを買います。", "このジャケットが好きです。"],
        "Converse sobre hábitos": ["早く起きます。", "八時に朝ご飯を食べます。", "朝働きます。", "夜勉強します。", "昼ご飯を食べます。", "運動します。", "夜、本を読みます。", "週末休みます。", "いつも勉強します。", "時々料理します。"],
        "Exponha preferências": ["コーヒーが好きです。", "魚が好きではありません。", "お茶のほうが好きです。", "ブラジル料理が好きです。", "音楽を聞くのが好きです。", "映画を見るのが好きです。", "サッカーが好きです。", "この町が好きです。", "暖かい天気が好きです。", "いいと思います。"],
    },
    "en": {
        "Converse sobre viagem": ["I travel to London.", "I need a ticket.", "I have a hotel.", "Where is the station?", "I need a map.", "I take the train.", "When does the bus leave?", "This is my luggage.", "I need help.", "I arrive today."],
        "Peça em um restaurante": ["I have a table.", "The menu, please.", "I will have soup.", "I will have the chicken.", "I would like water.", "I would like dessert.", "No meat, please.", "What do you recommend?", "The bill, please.", "Thank you very much."],
        "Compartilhe contato": ["My phone number is one two three.", "My email is here.", "This is my address.", "My name is Victor.", "My last name is Fernandes.", "The number is four five six.", "Can you repeat that?", "I spell my name.", "I write a message.", "Here is my contact."],
        "Fale de sua família": ["This is my mother.", "This is my father.", "I have a brother.", "I have a sister.", "My son is here.", "My daughter is young.", "My grandparents live here.", "My mother is fifty years old.", "This is my house.", "My family is big."],
        "Converse sobre o trabalho, use o tempo presente": ["I am a teacher.", "I work at a school.", "I work here.", "I work from nine to five.", "I have a meeting.", "I use the computer.", "I teach English.", "I study every day.", "I work today.", "I take a break."],
        "Descreva roupas": ["The shirt is blue.", "The pants are black.", "The shoes are new.", "The coat is warm.", "The color is nice.", "The size is small.", "The price is good.", "I try this on.", "I buy the shirt.", "I like this jacket."],
        "Converse sobre hábitos": ["I wake up early.", "I have breakfast at eight.", "I work in the morning.", "I study at night.", "I have lunch.", "I exercise.", "At night, I read.", "On the weekend, I rest.", "I always study.", "Sometimes I cook."],
        "Exponha preferências": ["I like coffee.", "I do not like fish.", "I prefer tea.", "I like Brazilian food.", "I like listening to music.", "I like watching movies.", "I like soccer.", "I like this city.", "I like warm weather.", "I think this is good."],
    },
}

for title, goal, topics in _UNIT_SPECS:
    A1_UNITS.append({"title": title, "goal": goal, "topics": topics, "phrases": {code: [(pt, foreign) for pt, foreign in zip(topics, _TRANSLATIONS[code][title])] for code in _TRANSLATIONS}})
