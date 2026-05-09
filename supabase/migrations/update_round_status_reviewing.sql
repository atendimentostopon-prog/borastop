ALTER TABLE public.rounds DROP CONSTRAINT IF EXISTS rounds_status_check;

ALTER TABLE public.rounds
ADD CONSTRAINT rounds_status_check
CHECK (status IN ('waiting', 'playing', 'stopped', 'reviewing', 'finished'));
