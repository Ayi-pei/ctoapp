CREATE OR REPLACE FUNCTION handle_task_completion(p_trigger_type public.task_trigger_type)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  -- Use the authenticated user's ID
  v_user_id uuid := auth.uid();
  v_task_id uuid;
  v_today date := CURRENT_DATE;
BEGIN

  -- 1. Find the task_id based on the trigger type. 
  --    This assumes one trigger type maps to one task for simplicity.
  --    If multiple tasks could be triggered, this would need a loop.
  SELECT id INTO v_task_id
  FROM public.daily_tasks
  WHERE trigger = p_trigger_type AND status = 'published'
  LIMIT 1;

  -- 2. If no task is found for this trigger, exit.
  IF v_task_id IS NULL THEN
    RAISE NOTICE 'No published task found for trigger: %', p_trigger_type;
    RETURN;
  END IF;

  -- 3. Check if the user has already completed this task today.
  --    This prevents duplicate completions for the same task on the same day.
  IF EXISTS (
    SELECT 1
    FROM public.user_task_states
    WHERE user_id = v_user_id 
      AND task_id = v_task_id
      AND date_trunc('day', created_at) = v_today
      AND completed = TRUE
  ) THEN
    RAISE NOTICE 'User % has already completed task % today.', v_user_id, v_task_id;
    RETURN;
  END IF;

  -- 4. Insert or update the user's task state to mark it as completed.
  --    The ON CONFLICT clause handles cases where a user might attempt the task
  --    multiple times in a day before it's successfully marked completed.
  INSERT INTO public.user_task_states (user_id, task_id, completed, date, progress)
  VALUES (v_user_id, v_task_id, TRUE, v_today, 1)
  ON CONFLICT (user_id, task_id, date) 
  DO UPDATE SET completed = TRUE, progress = 1, updated_at = now();

  RAISE NOTICE 'Task % marked as completed for user %', v_task_id, v_user_id;

END;
$$;