import { IsString, IsBoolean, IsOptional, IsEnum, IsDateString, MinLength } from 'class-validator';
import { TodoCategory } from './todo.entity';

export class CreateTodoDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsEnum(TodoCategory)
  category?: TodoCategory;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsEnum(TodoCategory)
  category?: TodoCategory;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
