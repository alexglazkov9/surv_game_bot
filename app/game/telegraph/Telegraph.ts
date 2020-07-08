import axios = require("axios");
import parse from "html-dom-parser";
import { logger } from "../../utils/logger";

const API_URL = "https://api.telegra.ph/";
const CREATE_ACCOUNT = "createAccount?";
const CREATE_PAGE = "createPage?";

export type Node = NodeElement;

export interface NodeElement {
  tag?: string;
  attrs?: {
    href?: string;
    src?: string;
  };
  children?: Node[] | string;
}

export class Telegraph {
  static createAccount = async (accountName: string): Promise<string> => {
    const data = await axios.default.get(
      `${API_URL}${CREATE_ACCOUNT}short_name=${accountName}&author_name=SurvgramBot`
    );

    console.log(data.data.result);
    return data.data.result.access_token;
  };

  static post = async (content: string) => {
    const formattedContent = Telegraph.domToNode(parse(`<p>${content}</p>`)[0])?.children;

    let data = undefined;
    try {
      data = await axios.default({
        method: "POST",
        url: `${API_URL}${CREATE_PAGE}`,
        data: `access_token=${
          process.env.TELEGRAPH_TOKEN
        }&title=Battle+ID&author_name=SurvgramBot&content=${encodeURIComponent(
          JSON.stringify(formattedContent)
        )}`,
      });
    } catch (err) {
      console.log(err.response.request._response);
    }

    return data?.data?.result?.url ?? "";
  };

  static domToNode = (domNode: any): Node | undefined => {
    if (domNode.type === "text") {
      return domNode.data;
    }
    if (domNode.type !== "tag") {
      return;
    }

    const nodeElement: NodeElement = { tag: undefined };
    nodeElement.tag = domNode.name.toLowerCase();
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < domNode.attribs.length; i++) {
      const attr = domNode.attribs[i];
      if (attr.name === "href" || attr.name === "src") {
        if (!nodeElement.attrs) {
          nodeElement.attrs = {};
        }
        nodeElement.attrs[attr.name as "href" | "src"] = attr.value;
      }
    }
    if (domNode.children.length > 0) {
      nodeElement.children = [];
      // tslint:disable-next-line: prefer-for-of
      for (let i = 0; i < domNode.children.length; i++) {
        const child = domNode.children[i];
        const childNode = Telegraph.domToNode(child);
        if (childNode !== undefined) nodeElement.children.push(childNode);
      }
    }
    return nodeElement;
  };
}
