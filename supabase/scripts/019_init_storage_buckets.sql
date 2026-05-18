BEGIN;
SELECT public.ensure_storage('likelee-public', 'likelee-private', 'likelee-temp');
COMMIT;
