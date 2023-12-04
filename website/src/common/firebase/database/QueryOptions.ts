type QueryOptions = {
    /** Maximum number of retrieved records. */
    limit?:number,
    /** Specific ID of record to be retrieved. */
    id?:string,
    /** Specific ID excluded from retrieved records. */
    notId?:string
}

export default QueryOptions;