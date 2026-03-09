
-- Clean character_won references in turns
UPDATE trivia_1v1_turns SET character_won = NULL WHERE character_won IN (
  'a455b5ad-7f2d-462a-9340-4bd1e800c68a',
  '12b98f60-9955-4eae-a016-ba7fb981dfc0',
  '495e5320-ca28-43a8-b225-116e6f24d8cc'
);

-- Clean matches
UPDATE trivia_1v1_matches SET current_category_id = NULL WHERE current_category_id IN (
  'a455b5ad-7f2d-462a-9340-4bd1e800c68a',
  '12b98f60-9955-4eae-a016-ba7fb981dfc0',
  '495e5320-ca28-43a8-b225-116e6f24d8cc'
);

-- Delete turns with questions from these categories
DELETE FROM trivia_1v1_turns WHERE question_id IN (
  SELECT id FROM trivia_questions WHERE category_id IN (
    'a455b5ad-7f2d-462a-9340-4bd1e800c68a',
    '12b98f60-9955-4eae-a016-ba7fb981dfc0',
    '495e5320-ca28-43a8-b225-116e6f24d8cc'
  )
);

-- Delete questions
DELETE FROM trivia_questions WHERE category_id IN (
  'a455b5ad-7f2d-462a-9340-4bd1e800c68a',
  '12b98f60-9955-4eae-a016-ba7fb981dfc0',
  '495e5320-ca28-43a8-b225-116e6f24d8cc'
);

-- Delete categories
DELETE FROM trivia_categories WHERE id IN (
  'a455b5ad-7f2d-462a-9340-4bd1e800c68a',
  '12b98f60-9955-4eae-a016-ba7fb981dfc0',
  '495e5320-ca28-43a8-b225-116e6f24d8cc'
);
