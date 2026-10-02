import {sqliteTable,text,integer,index} from 'drizzle-orm/sqlite-core';
export const people=sqliteTable('people',{id:text('id').primaryKey(),name:text('name').notNull(),city:text('city').notNull(),profile:text('profile').notNull().default('{}')});
export const documents=sqliteTable('documents',{id:text('id').primaryKey(),person:text('person').notNull().references(()=>people.id),category:text('category').notNull(),name:text('name').notNull(),size:integer('size').notNull(),created:text('created').notNull()},t=>[index('idx_documents_person').on(t.person)]);
