export default abstract class StringUtil {

    private static ID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    public static generateID(length=20, useSecureRandom=false) {
        let out = "";

        if (useSecureRandom) {
            const indices = new Uint16Array(length);
            crypto.getRandomValues(indices);
            indices.forEach(n => out += this.ID_CHARS[n%this.ID_CHARS.length]);
        }
        else while (out.length < length) out += this.ID_CHARS[Math.floor(Math.random()*this.ID_CHARS.length)];

        return out;
    }

    public static capitalize(str:string):string {
        return str.slice(0,1).toUpperCase() + str.slice(1);
    }

    public static normalize(str:string) {
        return str.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase().trim()
    }

}