CREATE OR REPLACE VIEW menu_json_view AS
SELECT jsonb_build_object(
    'menu',
    jsonb_agg(
        jsonb_build_object(
            'course',
            jsonb_build_object(
                'type', c.type,
                'typemoji', c.typemoji,
                'items',
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', m.id,
                            'name', m.name,
                            'description', m.description,
                            'ingredients', m.ingredients,
                            'cost', m.cost,
                            'imagePath', m.image_path,
                            'rating', m.rating,
                            'available', m.available,
                            'type', m.type,
                            'mustTry', m.must_try,
                            'typePath', m.type_path,
                            'desc', m.item_desc
                        )
                    )
                    FROM menu_items m
                    WHERE m.course_id = c.id
                )
            )
        )
    )
) AS menu_json
FROM courses c;