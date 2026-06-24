DROP MATERIALIZED VIEW IF EXISTS menu_json_mv;

CREATE MATERIALIZED VIEW menu_json_mv AS
SELECT 
    1 AS id,
    jsonb_build_object(
        'menu',
        jsonb_agg(
            jsonb_build_object(
                'course',
                jsonb_build_object(
                    'type', c.type,
                    'typemoji', c.typemoji,
                    'items',
                    COALESCE(
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
                                    'list_name', m.list_name,
                                    'ItemLabel', m.item_label,
                                    'list',
                                    COALESCE(
                                        (
                                            SELECT jsonb_object_agg(
                                                io.option_name,
                                                io.price_modifier
                                            )
                                            FROM public.item_options io
                                            WHERE io.menu_item_id = m.id
                                        ),
                                        '{}'::jsonb
                                    ),
                                    'typePath', m.type_path,
                                    'desc', m.item_desc
                                )
                                ORDER BY m.id
                            )
                            FROM public.menu_items m
                            WHERE m.course_id = c.id
                        ),
                        '[]'::jsonb
                    )
                )
            )
        )
    ) AS menu_json
FROM public.courses c;