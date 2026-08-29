import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { PATHS } from '@/lib/paths';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: routePath } = await params;
  
  if (!routePath || routePath.length < 2) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const [type, ...rest] = routePath;
  const filename = rest.join('/');

  let basePath = '';
  if (type === 'posters') basePath = PATHS.posters;
  else if (type === 'backdrops') basePath = PATHS.backdrops;
  else if (type === 'thumbnails') basePath = PATHS.thumbnails;
  else {
    return new NextResponse('Not Found', { status: 404 });
  }

  const safePath = path.normalize(filename).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(basePath, safePath);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  let mimeType = 'application/octet-stream';
  if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
  else if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.webp') mimeType = 'image/webp';

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);

  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
      stream.on('end', () => controller.close());
      stream.on('error', (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': mimeType,
      'Content-Length': stat.size.toString(),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
