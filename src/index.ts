import fetch from "node-fetch";
import cheerio from "cheerio";

interface Post {
  id: number;
  date: Date;
  date_gmt: Date;
  guid: { rendered: string };
  modified: Date;
  modified_gmt: Date;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  author: number;
  featured_media: number;
  comment_status: string;
  ping_status: string;
  sticky: boolean;
  template: string;
  format: string;
  meta: number[];
  categories: number[];
  tags: number[];
  language: number[];
  dealstore: number[];
}

interface PostInfo {
  name: Post["title"]["rendered"];
  link: Post["link"];
}

(async function () {
  try {
    const data = await fetch(process.env.PAGE_ENDPOINT || "error");

    const jsonData = await data.json();

    const posts: PostInfo[] = jsonData.map(
      (post: Post): PostInfo => ({
        name: post.title.rendered,
        link: post.link,
      })
    );

    const udemyLinks = posts.map(async (post) => {
      const res = await fetch(post.link);

      const html = await res.text();
      const $ = cheerio.load(html);

      const udemyLink = $(".btn_offer_block.re_track_btn").attr("href");

      if (!udemyLink?.includes("udemy")) return;

      return {
        udemyCourseName: post.name,
        udemyLink,
      };
    });

    const udemyCourses = await Promise.all(udemyLinks);

    const mostValuedUdemyCourses = udemyCourses.map(async (udemyCourse) => {
      if (udemyCourse?.udemyLink) {
        const udemyCourseResponse = await fetch(udemyCourse.udemyLink);

        const html = await udemyCourseResponse.text();
        const $ = cheerio.load(html);

        const courseRank = $(
          '.udlite-heading-sm.star-rating--rating-number--3lVe8[data-purpose="rating-number"]'
        )
          .text()
          .replace(",", ".");

        const totalScores = $(
          '.styles--rating-wrapper--5a0Tr[data-purpose="rating"]'
        )
          .children()
          .last()
          .text()
          .match(/\d+([.,]\d+)?/)?.[0]
          ?.replace(",", ".");

        if (
          parseFloat(courseRank) >= 4.5 &&
          totalScores &&
          parseInt(totalScores) > 100
        )
          return udemyCourse;
      }

      return;
    });

    const result = await Promise.all(mostValuedUdemyCourses);

    console.log(result.filter(Boolean));
  } catch (error) {
    console.log(error);
  }
})();
