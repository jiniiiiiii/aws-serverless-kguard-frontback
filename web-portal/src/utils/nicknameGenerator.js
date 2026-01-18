export const generateNickname = () => {
    const adjectives = ['날쎈', '영역전개를 시전하는', '배고픈', '야근한', '행복한', '히노카미카구라를 쓰는', '난폭한', '조용한', '무지개색의'];
    const animals = ['다람쥐', '호랑이', '문어', '탄지로', '고양이', '강아지', '대머리독수리', '기린', '고죠사토루', '코주부원숭이'];

    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
    const randomNumber = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

    return `${randomAdjective}${randomAnimal}#${randomNumber}`;
};

export const getOrInitGuestUser = () => {
    const STORAGE_KEY_ID = 'kguard_guest_id';
    const STORAGE_KEY_NICK = 'kguard_guest_nick';

    let guestId = localStorage.getItem(STORAGE_KEY_ID);
    let guestNick = localStorage.getItem(STORAGE_KEY_NICK);

    if (!guestId || !guestNick) {
        // Init
        guestId = crypto.randomUUID();
        guestNick = generateNickname();

        localStorage.setItem(STORAGE_KEY_ID, guestId);
        localStorage.setItem(STORAGE_KEY_NICK, guestNick);
    }

    return { guestId, guestNick };
};
