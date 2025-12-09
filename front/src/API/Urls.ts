interface ApiUrlsIn {
    readonly BASE_URL: string;
    readonly UPLOAD_INV: string;
    readonly AUTH: string;
    readonly GET_INVS: string;
    readonly GET_USERS?: string;
    readonly UPDATE_INV: (id: number) => string;
}
const url = "http://localhost:5350/";

const ApiUrls: ApiUrlsIn = {
    BASE_URL: url,  
    UPLOAD_INV: url + "api/process",
    AUTH: url + "api/auth",
    GET_INVS: url + "api/factures",
    GET_USERS: url + "users",
    UPDATE_INV: (id: number) => `${url}api/factures/${id}`,
}

export default ApiUrls;
