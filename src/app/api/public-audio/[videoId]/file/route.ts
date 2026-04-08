import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/bantera-api";

type RouteContext = {
  params: Promise<{
    videoId: string;
  }>;
};

export const dynamic = "force-dynamic";

function parseRangeHeader(headerValue: string | null, totalBytes: number) {
  if (!headerValue?.startsWith("bytes=")) {
    return null;
  }

  const [rawStart, rawEnd] = headerValue.slice("bytes=".length).split("-", 2);
  if (!rawStart && !rawEnd) {
    return null;
  }

  let start = rawStart ? Number.parseInt(rawStart, 10) : Number.NaN;
  let end = rawEnd ? Number.parseInt(rawEnd, 10) : Number.NaN;

  if (Number.isNaN(start)) {
    const suffixLength = Number.isNaN(end) ? 0 : end;
    if (suffixLength <= 0) {
      return null;
    }
    start = Math.max(0, totalBytes - suffixLength);
    end = totalBytes - 1;
  } else {
    if (Number.isNaN(end) || end >= totalBytes) {
      end = totalBytes - 1;
    }
  }

  if (start < 0 || start >= totalBytes || end < start) {
    return null;
  }

  return { start, end };
}

export async function GET(request: Request, context: RouteContext) {
  const { videoId } = await context.params;
  const upstreamUrl = `${getApiBaseUrl()}/api/videos/${videoId}/file`;

  const upstream = await fetch(upstreamUrl, {
    cache: "no-store",
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Bantera could not load this audio file." },
      { status: upstream.status },
    );
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  const totalBytes = bytes.byteLength;
  const range = parseRangeHeader(request.headers.get("range"), totalBytes);

  const headers = new Headers();
  headers.set("content-type", upstream.headers.get("content-type") ?? "audio/wav");
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", upstream.headers.get("cache-control") ?? "no-store");

  if (range) {
    const slice = bytes.slice(range.start, range.end + 1);
    headers.set("content-length", String(slice.byteLength));
    headers.set(
      "content-range",
      `bytes ${range.start}-${range.end}/${totalBytes}`,
    );
    return new Response(slice, {
      status: 206,
      headers,
    });
  }

  headers.set("content-length", String(totalBytes));
  return new Response(bytes, {
    status: 200,
    headers,
  });
}
