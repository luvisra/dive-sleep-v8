/* tslint:disable */
/* eslint-disable */
import { Injectable } from '@angular/core';
import { generateClient } from 'aws-amplify/api';

// ==========================================
// 1. Interfaces & Filters (기존 호환성 보완)
// ==========================================

// -- Basic Scalar Filters --
export interface TableBooleanFilterInput {
  ne?: boolean | null;
  eq?: boolean | null;
}

export interface TableIntFilterInput {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  contains?: number | null;
  notContains?: number | null;
  between?: Array<number | null> | null;
}

export interface TableFloatFilterInput {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  contains?: number | null;
  notContains?: number | null;
  between?: Array<number | null> | null;
}

export interface TableStringFilterInput {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
}

export interface TableIDFilterInput {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
}

// -- Model Filters --
export interface TableDiveFamilyShareInfoFilterInput {
  enabled?: TableBooleanFilterInput | null;
  nickname?: TableStringFilterInput | null;
  requester?: TableStringFilterInput | null;
  status?: TableStringFilterInput | null;
  token?: TableStringFilterInput | null;
  username?: TableStringFilterInput | null;
}

export interface TableDiveSleepDataFilterInput {
  data?: TableStringFilterInput | null;
  dev_id?: TableStringFilterInput | null;
  mac_addr?: TableStringFilterInput | null;
  time_stamp?: TableStringFilterInput | null;
}

export interface TableDiveSleepUserinfoFilterInput {
  dev_id?: TableStringFilterInput | null;
  username?: TableStringFilterInput | null;
}

export interface TableMySleepDataFilterInput {
  dev_id?: TableStringFilterInput | null;
  ev_type?: TableStringFilterInput | null;
  time_stamp?: TableStringFilterInput | null;
}

// -- Model Interfaces --
export interface DiveFamilyShareInfo {
  enabled?: boolean | null;
  nickname?: string | null;
  requester: string;
  status?: string | null;
  token?: string | null;
  username: string;
}

export interface DiveSleepData {
  data?: string | null;
  dev_id: string;
  feeling?: number | null;
  mac_addr?: string | null;
  time_stamp: string;
}

export interface DiveSleepUserinfo {
  dev_id?: string | null;
  fcm_token?: string | null;
  link_account?: string | null;
  user_info?: string | null;
  username: string;
}

export interface MySleepData {
  band?: string | null;
  dev_id: string;
  ev_type?: string | null;
  heartrate?: number | null;
  impulse?: number | null;
  respiration?: number | null;
  sd?: string | null;
  snoring?: number | null;
  time_stamp: string;
  value?: string | null;
}

// -- Connection Types --
export interface DiveFamilyShareInfoConnection {
  items: Array<DiveFamilyShareInfo | null>;
  nextToken?: string | null;
}

export interface DiveSleepDataConnection {
  items: Array<DiveSleepData | null>;
  nextToken?: string | null;
}

export interface DiveSleepUserinfoConnection {
  items: Array<DiveSleepUserinfo | null>;
  nextToken?: string | null;
}

export interface MySleepDataConnection {
  items: Array<MySleepData | null>;
  nextToken?: string | null;
}

// -- Input Types --
export interface CreateDiveFamilyShareInfoInput {
  enabled?: boolean | null;
  nickname?: string | null;
  requester: string;
  status?: string | null;
  token?: string | null;
  username: string;
}

export interface UpdateDiveFamilyShareInfoInput {
  enabled?: boolean | null;
  nickname?: string | null;
  requester: string;
  status?: string | null;
  token?: string | null;
  username: string;
}

export interface DeleteDiveFamilyShareInfoInput {
  requester: string;
  username: string;
}

export interface CreateDiveSleepDataInput {
  data?: string | null;
  dev_id: string;
  mac_addr?: string | null;
  time_stamp: string;
}

export interface UpdateDiveSleepDataInput {
  data?: string | null;
  dev_id: string;
  feeling?: number | null;
  mac_addr?: string | null;
  time_stamp: string;
}

export interface DeleteDiveSleepDataInput {
  dev_id: string;
  time_stamp: string;
}

export interface CreateDiveSleepUserinfoInput {
  dev_id?: string | null;
  username: string;
}

export interface UpdateDiveSleepUserinfoInput {
  dev_id?: string | null;
  fcm_token?: string | null;
  link_account?: string | null;
  user_info?: string | null;
  username: string;
}

export interface DeleteDiveSleepUserinfoInput {
  username: string;
}

export interface CreateMySleepDataInput {
  dev_id: string;
  time_stamp: string;
}

export interface UpdateMySleepDataInput {
  dev_id: string;
  time_stamp: string;
}

export interface DeleteMySleepDataInput {
  dev_id: string;
  time_stamp: string;
}

// ==========================================
// 2. Compatibility Aliases (오류 해결 핵심)
// ==========================================
// 기존 코드에서 import { GetDiveSleepDataQuery } from ... 하던 것을 지원하기 위한 Alias
export type GetDiveSleepDataQuery = DiveSleepData;
export type ListDiveSleepUserinfosQuery = DiveSleepUserinfoConnection;
// 필요한 경우 다른 Query 타입도 여기에 추가하면 됩니다.

// ==========================================
// 3. APIService Class
// ==========================================

const client = generateClient() as any;

@Injectable({
  providedIn: 'root'
})
export class APIService {

  constructor() { }

  // -----------------------------------------------------------
  // Domain: Dive Sleep Data
  // -----------------------------------------------------------

  async CreateDiveSleepData(input: CreateDiveSleepDataInput): Promise<DiveSleepData> {
    const statement = `mutation CreateDiveSleepData($input: CreateDiveSleepDataInput!) {
        createDiveSleepData(input: $input) {
          data dev_id feeling mac_addr time_stamp
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.createDiveSleepData;
  }

  async UpdateDiveSleepData(input: UpdateDiveSleepDataInput): Promise<DiveSleepData> {
    const statement = `mutation UpdateDiveSleepData($input: UpdateDiveSleepDataInput!) {
        updateDiveSleepData(input: $input) {
          data dev_id feeling mac_addr time_stamp
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.updateDiveSleepData;
  }

  async DeleteDiveSleepData(input: DeleteDiveSleepDataInput): Promise<DiveSleepData> {
    const statement = `mutation DeleteDiveSleepData($input: DeleteDiveSleepDataInput!) {
        deleteDiveSleepData(input: $input) {
          dev_id time_stamp
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.deleteDiveSleepData;
  }

  async GetDiveSleepData(dev_id: string, time_stamp: string): Promise<DiveSleepData | undefined> {
    const statement = `query GetDiveSleepData($dev_id: String!, $time_stamp: String!) {
        getDiveSleepData(dev_id: $dev_id, time_stamp: $time_stamp) {
          data dev_id feeling mac_addr time_stamp
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { dev_id, time_stamp } }) as any;
    return response.data.getDiveSleepData;
  }

  async QueryDiveSleepData(dev_id: string, time_start: string, time_end?: string): Promise<DiveSleepDataConnection> {
    console.log('[DEBUG API] QueryDiveSleepData called with:', { dev_id, time_start, time_end });
    const statement = `query QueryDiveSleepData($dev_id: String!, $time_start: String!, $time_end: String) {
        queryDiveSleepData(dev_id: $dev_id, time_start: $time_start, time_end: $time_end) {
          items {
            data dev_id feeling mac_addr time_stamp
          }
          nextToken
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { dev_id, time_start, time_end } }) as any;
    console.log('[DEBUG API] QueryDiveSleepData response:', response.data.queryDiveSleepData);
    return response.data.queryDiveSleepData;
  }

  // [수정됨] filter 인자 추가
  async ListDiveSleepData(filter?: TableDiveSleepDataFilterInput, limit?: number, nextToken?: string): Promise<DiveSleepDataConnection> {
    const statement = `query ListDiveSleepData($filter: TableDiveSleepDataFilterInput, $limit: Int, $nextToken: String) {
        listDiveSleepData(filter: $filter, limit: $limit, nextToken: $nextToken) {
          items {
             data dev_id feeling mac_addr time_stamp
          }
          nextToken
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { filter, limit, nextToken } }) as any;
    return response.data.listDiveSleepData;
  }

  // -----------------------------------------------------------
  // Domain: Dive Sleep User Info
  // -----------------------------------------------------------

  async CreateDiveSleepUserinfo(input: CreateDiveSleepUserinfoInput): Promise<DiveSleepUserinfo> {
    const statement = `mutation CreateDiveSleepUserinfo($input: CreateDiveSleepUserinfoInput!) {
        createDiveSleepUserinfo(input: $input) {
           dev_id fcm_token link_account user_info username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.createDiveSleepUserinfo;
  }

  async UpdateDiveSleepUserinfo(input: UpdateDiveSleepUserinfoInput): Promise<DiveSleepUserinfo> {
    const statement = `mutation UpdateDiveSleepUserinfo($input: UpdateDiveSleepUserinfoInput!) {
        updateDiveSleepUserinfo(input: $input) {
           dev_id fcm_token link_account user_info username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.updateDiveSleepUserinfo;
  }

  async DeleteDiveSleepUserinfo(input: DeleteDiveSleepUserinfoInput): Promise<DiveSleepUserinfo> {
    const statement = `mutation DeleteDiveSleepUserinfo($input: DeleteDiveSleepUserinfoInput!) {
        deleteDiveSleepUserinfo(input: $input) {
           username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.deleteDiveSleepUserinfo;
  }

  async GetDiveSleepUserinfo(username: string): Promise<DiveSleepUserinfo | undefined> {
    const statement = `query GetDiveSleepUserinfo($username: String!) {
        getDiveSleepUserinfo(username: $username) {
          dev_id fcm_token link_account user_info username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { username } }) as any;
    return response.data.getDiveSleepUserinfo;
  }

  async QueryDiveSleepUserinfo(username: string): Promise<DiveSleepUserinfoConnection> {
    const statement = `query QueryDiveSleepUserinfo($username: String!) {
        queryDiveSleepUserinfo(username: $username) {
          items {
             dev_id fcm_token link_account user_info username
          }
          nextToken
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { username } }) as any;
    return response.data.queryDiveSleepUserinfo;
  }

  // [수정됨] filter 인자 추가
  async ListDiveSleepUserinfos(filter?: TableDiveSleepUserinfoFilterInput, limit?: number, nextToken?: string): Promise<DiveSleepUserinfoConnection> {
    const statement = `query ListDiveSleepUserinfos($filter: TableDiveSleepUserinfoFilterInput, $limit: Int, $nextToken: String) {
        listDiveSleepUserinfos(filter: $filter, limit: $limit, nextToken: $nextToken) {
          items {
             dev_id fcm_token link_account user_info username
          }
          nextToken
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { filter, limit, nextToken } }) as any;
    return response.data.listDiveSleepUserinfos;
  }

  // -----------------------------------------------------------
  // Domain: My Sleep Data
  // -----------------------------------------------------------

  async CreateMySleepData(input: CreateMySleepDataInput): Promise<MySleepData> {
    const statement = `mutation CreateMySleepData($input: CreateMySleepDataInput!) {
        createMySleepData(input: $input) {
           band dev_id ev_type heartrate impulse respiration sd snoring time_stamp value
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.createMySleepData;
  }

  async UpdateMySleepData(input: UpdateMySleepDataInput): Promise<MySleepData> {
    const statement = `mutation UpdateMySleepData($input: UpdateMySleepDataInput!) {
        updateMySleepData(input: $input) {
           band dev_id ev_type heartrate impulse respiration sd snoring time_stamp value
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.updateMySleepData;
  }

  async GetMySleepData(dev_id: string, time_stamp: string): Promise<MySleepData | undefined> {
    const statement = `query GetMySleepData($dev_id: String!, $time_stamp: String!) {
        getMySleepData(dev_id: $dev_id, time_stamp: $time_stamp) {
          band dev_id ev_type heartrate impulse respiration sd snoring time_stamp value
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { dev_id, time_stamp } }) as any;
    return response.data.getMySleepData;
  }

  async QueryMySleepData(dev_id: string, ev_type?: string, time_stamp?: string, time_stamp2?: string): Promise<MySleepDataConnection> {
    const statement = `query QueryMySleepData($dev_id: String!, $ev_type: String, $time_stamp: String, $time_stamp2: String) {
        queryMySleepData(dev_id: $dev_id, ev_type: $ev_type, time_stamp: $time_stamp, time_stamp2: $time_stamp2) {
          items {
             band dev_id ev_type heartrate impulse respiration sd snoring time_stamp value
          }
          nextToken
        }
      }`;
    const response = await client.graphql({
      query: statement,
      variables: { dev_id, ev_type, time_stamp, time_stamp2 }
    }) as any;
    return response.data.queryMySleepData;
  }

  // [수정됨] filter 인자 추가
  async ListMySleepData(filter?: TableMySleepDataFilterInput, limit?: number, nextToken?: string): Promise<MySleepDataConnection> {
    const statement = `query ListMySleepData($filter: TableMySleepDataFilterInput, $limit: Int, $nextToken: String) {
        listMySleepData(filter: $filter, limit: $limit, nextToken: $nextToken) {
          items {
             band dev_id ev_type heartrate impulse respiration sd snoring time_stamp value
          }
          nextToken
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { filter, limit, nextToken } }) as any;
    return response.data.listMySleepData;
  }

  // -----------------------------------------------------------
  // Domain: Dive Family Share Info
  // -----------------------------------------------------------

  async CreateDiveFamilyShareInfo(input: CreateDiveFamilyShareInfoInput): Promise<DiveFamilyShareInfo> {
    const statement = `mutation CreateDiveFamilyShareInfo($input: CreateDiveFamilyShareInfoInput!) {
        createDiveFamilyShareInfo(input: $input) {
          enabled nickname requester status token username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.createDiveFamilyShareInfo;
  }

  async UpdateDiveFamilyShareInfo(input: UpdateDiveFamilyShareInfoInput): Promise<DiveFamilyShareInfo> {
    const statement = `mutation UpdateDiveFamilyShareInfo($input: UpdateDiveFamilyShareInfoInput!) {
        updateDiveFamilyShareInfo(input: $input) {
          enabled nickname requester status token username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.updateDiveFamilyShareInfo;
  }

  async DeleteDiveFamilyShareInfo(input: DeleteDiveFamilyShareInfoInput): Promise<DiveFamilyShareInfo> {
    const statement = `mutation DeleteDiveFamilyShareInfo($input: DeleteDiveFamilyShareInfoInput!) {
        deleteDiveFamilyShareInfo(input: $input) {
          requester username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { input } }) as any;
    return response.data.deleteDiveFamilyShareInfo;
  }

  async GetDiveFamilyShareInfo(requester: string, username: string): Promise<DiveFamilyShareInfo | undefined> {
    const statement = `query GetDiveFamilyShareInfo($requester: String!, $username: String!) {
        getDiveFamilyShareInfo(requester: $requester, username: $username) {
          enabled nickname requester status token username
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { requester, username } }) as any;
    return response.data.getDiveFamilyShareInfo;
  }

  async QueryDiveFamilyShareinfo(username: string): Promise<DiveFamilyShareInfoConnection> {
    const statement = `query QueryDiveFamilyShareinfo($username: String!) {
        queryDiveFamilyShareinfo(username: $username) {
           items {
            enabled nickname requester status token username
          }
          nextToken
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { username } }) as any;
    return response.data.queryDiveFamilyShareinfo;
  }

  // [수정됨] filter 인자 추가
  async ListDiveFamilyShareInfos(filter?: TableDiveFamilyShareInfoFilterInput, limit?: number, nextToken?: string): Promise<DiveFamilyShareInfoConnection> {
    const statement = `query ListDiveFamilyShareInfos($filter: TableDiveFamilyShareInfoFilterInput, $limit: Int, $nextToken: String) {
        listDiveFamilyShareInfos(filter: $filter, limit: $limit, nextToken: $nextToken) {
          items {
            enabled nickname requester status token username
          }
          nextToken
        }
      }`;
    const response = await client.graphql({ query: statement, variables: { filter, limit, nextToken } }) as any;
    return response.data.listDiveFamilyShareInfos;
  }
}